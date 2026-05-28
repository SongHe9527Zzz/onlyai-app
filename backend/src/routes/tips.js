import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'
import Stripe from 'stripe'

const router = Router()

let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
}

// Allowed tip amounts
const TIP_AMOUNTS = [1, 3, 5, 10]
const CUSTOM_MIN = 1
const CUSTOM_MAX = 999

// ─────────────────────────────────────────────────
// POST /api/tip — send a tip to a character
// ─────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { characterId, amount, message: tipMessage, paymentMethodId } = req.body

    // Validate required fields
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' })
    }

    if (!amount || amount < CUSTOM_MIN || amount > CUSTOM_MAX) {
      return res.status(400).json({
        error: `Amount must be between $${CUSTOM_MIN} and $${CUSTOM_MAX}`
      })
    }

    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100

    // Truncate message if present
    if (tipMessage && tipMessage.length > 200) {
      tipMessage = tipMessage.substring(0, 200)
    }

    let paymentStatus = 'completed'
    let paymentMethod = 'dev_mode'

    // If Stripe is configured and we have a payment method, process payment
    if (stripe && paymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // cents
          currency: 'usd',
          payment_method: paymentMethodId,
          confirmation_method: 'manual',
          confirm: true,
          metadata: {
            userId: req.user.id,
            characterId,
            type: 'tip'
          }
        })

        paymentStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'pending'
        paymentMethod = 'stripe'
      } catch (stripeErr) {
        console.error('[Tips] Stripe error:', stripeErr.message)
        // Continue with dev mode if Stripe fails
      }
    }

    // Record the tip
    const result = await query(
      `INSERT INTO tips (from_user_id, character_id, amount, currency, message, payment_method, payment_status)
       VALUES ($1, $2, $3, 'usd', $4, $5, $6)
       RETURNING id, amount, currency, message, created_at, payment_status`,
      [req.user.id, characterId, amount, tipMessage || null, paymentMethod, paymentStatus]
    )

    console.log(`[Tips] ${req.user.email || req.user.id} tipped $${amount} to ${characterId}`)

    res.status(201).json({
      tip: result.rows[0],
      paymentStatus
    })
  } catch (err) {
    console.error('[Tips] Create tip error:', err)
    res.status(500).json({ error: 'Failed to send tip' })
  }
})

// ─────────────────────────────────────────────────
// GET /api/tip/amounts — get allowed tip amounts
// ─────────────────────────────────────────────────
router.get('/amounts', (req, res) => {
  res.json({
    presets: TIP_AMOUNTS,
    custom: { min: CUSTOM_MIN, max: CUSTOM_MAX },
    currency: 'usd'
  })
})

// ─────────────────────────────────────────────────
// GET /api/tip/received — tips received by the user's characters
// ─────────────────────────────────────────────────
router.get('/received', authenticateToken, async (req, res) => {
  try {
    // For now, return all tips as a simple view
    // In production, this would be scoped to the creator's characters
    const result = await query(
      `SELECT t.id, t.from_user_id, t.character_id, t.amount, t.currency,
              t.message, t.payment_status, t.created_at,
              u.username as from_username
       FROM tips t
       LEFT JOIN users u ON u.id = t.from_user_id
       ORDER BY t.created_at DESC
       LIMIT 50`
    )

    res.json({ tips: result.rows })
  } catch (err) {
    console.error('[Tips] Received tips error:', err)
    res.json({ tips: [] })
  }
})

// ─────────────────────────────────────────────────
// GET /api/tip/sent — tips sent by the current user
// ─────────────────────────────────────────────────
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.character_id, t.amount, t.currency,
              t.message, t.payment_status, t.created_at
       FROM tips t
       WHERE t.from_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.user.id]
    )

    res.json({ tips: result.rows })
  } catch (err) {
    console.error('[Tips] Sent tips error:', err)
    res.json({ tips: [] })
  }
})

// ─────────────────────────────────────────────────
// GET /api/tip/stats/:characterId — tip statistics for a character
// ─────────────────────────────────────────────────
router.get('/stats/:characterId', authenticateToken, async (req, res) => {
  try {
    const { characterId } = req.params

    // Get all completed tips for this character
    const tipsResult = await query(
      `SELECT amount, from_user_id FROM tips WHERE character_id = $1 AND payment_status = 'completed'`,
      [characterId]
    )

    const tips = tipsResult.rows || []
    const total_amount = tips.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    const largest_tip = tips.length > 0 ? Math.max(...tips.map(t => parseFloat(t.amount) || 0)) : 0
    const userTips = tips.filter(t => t.from_user_id === req.user.id)
    const user_total = userTips.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

    res.json({ stats: {
      total_tips: tips.length,
      total_amount,
      largest_tip,
      user_tip_count: userTips.length,
      user_total
    }})
  } catch (err) {
    console.error('[Tips] Stats error:', err)
    res.json({ stats: { total_tips: 0, total_amount: 0, largest_tip: 0, user_tip_count: 0, user_total: 0 } })
  }
})

export default router
