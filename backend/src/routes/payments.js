import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'
import Stripe from 'stripe'

const router = Router()

// Initialize Stripe (safe if no key configured)
let stripe = null
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
if (STRIPE_KEY) {
  stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-11-20.acacia' })
  console.log('[Stripe] Initialized')
} else {
  console.log('[Stripe] No STRIPE_SECRET_KEY — running in dev/mock mode')
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Plan definitions
const PLANS = {
  standard: { name: 'Standard', price: 7.99, stripePriceId: process.env.STRIPE_PRICE_STANDARD },
  premium:  { name: 'Premium',  price: 15.99, stripePriceId: process.env.STRIPE_PRICE_PREMIUM },
  vip:      { name: 'VIP',      price: 29.99, stripePriceId: process.env.STRIPE_PRICE_VIP }
}

// ─────────────────────────────────────────────────
// POST /api/payments/create-checkout-session
// Creates a Stripe Checkout Session for subscription
// ─────────────────────────────────────────────────
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { characterId, plan, successUrl, cancelUrl } = req.body

    if (!characterId || !plan) {
      return res.status(400).json({ error: 'characterId and plan are required' })
    }

    const planConfig = PLANS[plan]
    if (!planConfig) {
      return res.status(400).json({ error: `Invalid plan: ${plan}. Must be standard, premium, or vip.` })
    }

    // If Stripe is not configured, fall back to direct subscription creation
    if (!stripe) {
      console.log('[Payments] Stripe not configured — creating subscription directly (dev mode)')

      // Check for existing subscription
      const existing = await query(
        `SELECT id FROM subscriptions WHERE user_id = $1 AND character_id = $2 AND status = 'active'`,
        [req.user.id, characterId]
      )
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Already subscribed to this character' })
      }

      const subResult = await query(
        `INSERT INTO subscriptions (user_id, character_id, plan, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, character_id, plan, status, created_at`,
        [req.user.id, characterId, plan]
      )

      // Ensure conversation exists
      await query(
        `INSERT INTO conversations (user_id, character_id)
         VALUES ($1, $2) ON CONFLICT (user_id, character_id) DO NOTHING`,
        [req.user.id, characterId]
      )

      // Record payment order
      await query(
        `INSERT INTO payment_orders (user_id, character_id, amount, currency, plan, status, payment_method)
         VALUES ($1, $2, $3, 'usd', $4, 'completed', 'dev_mode')
         RETURNING id`,
        [req.user.id, characterId, planConfig.price, plan]
      )

      return res.json({
        url: null,
        subscription: subResult.rows[0],
        devMode: true,
        message: 'Subscription created in development mode'
      })
    }

    // Stripe mode — create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        characterId,
        plan
      },
      success_url: successUrl || `${FRONTEND_URL}/subscribe/${characterId}?session_id={CHECKOUT_SESSION_ID}&checkout=success&plan=${plan}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}/subscribe/${characterId}?canceled=true`
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('[Payments] Create checkout session error:', err)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// ─────────────────────────────────────────────────
// POST /api/payments/webhook
// Handles Stripe webhook events
// ─────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  // Verify webhook signature
  if (stripe && process.env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
  } else {
    // Dev mode — parse body as JSON (body is raw buffer, need to parse)
    try {
      event = JSON.parse(req.body.toString())
    } catch {
      return res.status(400).send('Invalid webhook payload')
    }
  }

  console.log('[Webhook] Received event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, characterId, plan } = session.metadata || {}

        if (userId && characterId && plan) {
          // Create subscription in our database
          const subResult = await query(
            `INSERT INTO subscriptions (user_id, character_id, plan, status, stripe_subscription_id)
             VALUES ($1, $2, $3, 'active', $4)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [userId, characterId, plan, session.subscription]
          )

          if (subResult.rows.length > 0) {
            // Ensure conversation exists
            await query(
              `INSERT INTO conversations (user_id, character_id)
               VALUES ($1, $2) ON CONFLICT (user_id, character_id) DO NOTHING`,
              [userId, characterId]
            )

            // Record payment order
            const amount = session.amount_total ? session.amount_total / 100 : (PLANS[plan]?.price || 7.99)
            await query(
              `INSERT INTO payment_orders (user_id, character_id, amount, currency, plan, status, payment_method, stripe_session_id)
               VALUES ($1, $2, $3, 'usd', $4, 'completed', 'stripe', $5)
               RETURNING id`,
              [userId, characterId, amount, plan, session.id]
            )
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        const subId = invoice.subscription
        const amountPaid = invoice.amount_paid / 100

        // Update subscription period
        if (subId) {
          await query(
            `UPDATE subscriptions SET
              current_period_start = to_timestamp($1),
              current_period_end = to_timestamp($2),
              status = 'active',
              updated_at = NOW()
             WHERE stripe_subscription_id = $3`,
            [invoice.period_start, invoice.period_end, subId]
          )
        }

        // Record payment
        await query(
          `INSERT INTO payment_orders (user_id, amount, currency, status, payment_method, stripe_invoice_id, metadata)
           VALUES (
             (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1),
             $2, 'usd', 'completed', 'stripe', $3,
             $4::jsonb
           )`,
          [subId, amountPaid, invoice.id, JSON.stringify({ invoiceNumber: invoice.number })]
        )
        break
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object
        const failedSubId = failedInvoice.subscription

        console.warn('[Webhook] Payment failed for subscription:', failedSubId)
        break
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object
        // Cancel our subscription record
        await query(
          `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [deletedSub.id]
        )
        break
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object
        // Update plan if changed
        const priceId = updatedSub.items?.data?.[0]?.price?.id
        let plan = 'standard'
        if (priceId === process.env.STRIPE_PRICE_PREMIUM) plan = 'premium'
        else if (priceId === process.env.STRIPE_PRICE_VIP) plan = 'vip'

        await query(
          `UPDATE subscriptions SET plan = $1, status = $2, updated_at = NOW()
           WHERE stripe_subscription_id = $3`,
          [plan, updatedSub.status === 'active' ? 'active' : 'cancelled', updatedSub.id]
        )
        break
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Webhook] Processing error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// ─────────────────────────────────────────────────
// GET /api/payments/invoices — list user's invoices
// ─────────────────────────────────────────────────
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    // Return payment orders as invoices
    const result = await query(
      `SELECT id, amount, currency, plan, status, payment_method, created_at as date, stripe_invoice_id, metadata
       FROM payment_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    )

    const invoices = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      amount: Math.round(row.amount * 100), // in cents
      amountPaid: Math.round(row.amount * 100),
      status: row.status === 'completed' ? 'paid' : row.status,
      plan: row.plan,
      paymentMethod: row.payment_method,
      invoiceNumber: row.metadata?.invoiceNumber || row.id
    }))

    res.json({ invoices })
  } catch (err) {
    console.error('[Payments] Invoices error:', err)
    res.json({ invoices: [] })
  }
})

// ─────────────────────────────────────────────────
// GET /api/payments/orders — list user's payment orders
// ─────────────────────────────────────────────────
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT po.id, po.character_id, po.amount, po.currency, po.plan, po.status,
              po.payment_method, po.stripe_session_id, po.created_at,
              po.metadata
       FROM payment_orders po
       WHERE po.user_id = $1
       ORDER BY po.created_at DESC
       LIMIT 100`,
      [req.user.id]
    )

    res.json({ orders: result.rows })
  } catch (err) {
    console.error('[Payments] Orders error:', err)
    res.json({ orders: [] })
  }
})

// ─────────────────────────────────────────────────
// POST /api/payments/cancel-subscription
// Cancel a Stripe subscription
// ─────────────────────────────────────────────────
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.body

    if (stripe && subscriptionId && subscriptionId.startsWith('sub_')) {
      // Cancel in Stripe
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })
    }

    // Also cancel in our DB
    const result = await query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE stripe_subscription_id = $1 AND user_id = $2
       RETURNING id, status`,
      [subscriptionId, req.user.id]
    )

    if (result.rows.length === 0) {
      // Try direct ID match
      const result2 = await query(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1::bigint AND user_id = $2
         RETURNING id, status`,
        [subscriptionId, req.user.id]
      )
      if (result2.rows.length === 0) {
        return res.status(404).json({ error: 'Subscription not found' })
      }
      return res.json({ subscription: result2.rows[0] })
    }

    res.json({ subscription: result.rows[0] })
  } catch (err) {
    console.error('[Payments] Cancel subscription error:', err)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

// ─────────────────────────────────────────────────
// POST /api/payments/update-subscription
// Update subscription plan
// ─────────────────────────────────────────────────
router.post('/update-subscription', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId, newPlan } = req.body

    if (!newPlan || !PLANS[newPlan]) {
      return res.status(400).json({ error: `Invalid plan: ${newPlan}` })
    }

    // Dev mode — handle by cancelling old + creating new
    if (!stripe || !subscriptionId || !subscriptionId.startsWith('sub_')) {
      // Get current subscription
      const currentSub = await query(
        `SELECT id FROM subscriptions WHERE id = $1::bigint AND user_id = $2 AND status = 'active'`,
        [subscriptionId, req.user.id]
      )
      if (currentSub.rows.length === 0) {
        return res.status(404).json({ error: 'Active subscription not found' })
      }

      // Cancel old
      await query(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1::bigint`,
        [subscriptionId]
      )

      // Get character info from old sub
      const oldSub = await query(
        `SELECT character_id FROM subscriptions WHERE id = $1::bigint`,
        [subscriptionId]
      )

      const characterId = oldSub.rows[0]?.character_id
      if (!characterId) {
        return res.status(404).json({ error: 'Subscription not found' })
      }

      // Create new subscription
      const newSub = await query(
        `INSERT INTO subscriptions (user_id, character_id, plan, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, character_id, plan, status, created_at`,
        [req.user.id, characterId, newPlan]
      )

      return res.json({ subscription: newSub.rows[0], devMode: true })
    }

    // Stripe mode — update plan
    if (stripe && PLANS[newPlan].stripePriceId) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ price: PLANS[newPlan].stripePriceId }]
      })

      await query(
        `UPDATE subscriptions SET plan = $1, updated_at = NOW()
         WHERE stripe_subscription_id = $2 AND user_id = $3`,
        [newPlan, subscriptionId, req.user.id]
      )
    }

    res.json({ success: true, plan: newPlan })
  } catch (err) {
    console.error('[Payments] Update subscription error:', err)
    res.status(500).json({ error: 'Failed to update subscription' })
  }
})

// ─────────────────────────────────────────────────
// POST /api/payments/create-payment-intent (for tips)
// ─────────────────────────────────────────────────
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, characterId } = req.body

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Amount must be at least $1' })
    }

    if (!stripe) {
      // Dev mode — return mock client secret
      return res.json({
        clientSecret: 'pi_mock_dev_secret',
        devMode: true,
        amount
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      metadata: {
        userId: req.user.id,
        characterId: characterId || ''
      }
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[Payments] Create payment intent error:', err)
    res.status(500).json({ error: 'Failed to create payment intent' })
  }
})

// ─────────────────────────────────────────────────
// GET /api/payments/stripe-config
// Returns the Stripe publishable key for frontend
// ─────────────────────────────────────────────────
router.get('/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    configured: !!process.env.STRIPE_SECRET_KEY
  })
})

export default router
