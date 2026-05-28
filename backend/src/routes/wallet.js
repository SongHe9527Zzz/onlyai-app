import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// ─────────────────────────────────────────────────
// GET /api/wallet — get user's wallet balance
// ─────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    let result = await query(
      'SELECT id, balance, currency, created_at, updated_at FROM wallets WHERE user_id = $1',
      [req.user.id]
    )

    // Auto-create wallet if it doesn't exist
    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO wallets (user_id, balance, currency)
         VALUES ($1, 0, 'usd')
         RETURNING id, balance, currency, created_at, updated_at`,
        [req.user.id]
      )
    }

    const wallet = result.rows[0]

    // Calculate total spent
    const spentResult = await query(
      `SELECT amount, type, status FROM payment_orders WHERE user_id = $1`,
      [req.user.id]
    )

    const orders = spentResult.rows || []
    let total_spent = 0
    let total_tips = 0
    let total_subscriptions = 0

    for (const order of orders) {
      if (order.status === 'completed' || order.status === 'paid') {
        const amt = parseFloat(order.amount) || 0
        total_spent += amt
        if (order.type === 'tip') total_tips += amt
        else if (order.type === 'subscription') total_subscriptions += amt
      }
    }

    res.json({
      wallet: {
        ...wallet,
        balance: parseFloat(wallet.balance) || 0
      },
      spending: {
        total_spent: 0, total_tips: 0, total_subscriptions: 0
      }
    })
  } catch (err) {
    console.error('[Wallet] Get error:', err)
    res.json({
      wallet: { id: null, balance: 0, currency: 'usd' },
      spending: { total_spent: 0, total_tips: 0, total_subscriptions: 0 }
    })
  }
})

// ─────────────────────────────────────────────────
// POST /api/wallet/deposit — deposit funds (dev mode)
// ─────────────────────────────────────────────────
router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body

    if (!amount || amount <= 0 || amount > 9999) {
      return res.status(400).json({ error: 'Invalid deposit amount (1-9999)' })
    }

    // Ensure wallet exists
    let walletResult = await query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [req.user.id]
    )

    if (walletResult.rows.length === 0) {
      walletResult = await query(
        `INSERT INTO wallets (user_id, balance, currency)
         VALUES ($1, 0, 'usd')
         RETURNING id, balance`,
        [req.user.id]
      )
    }

    const wallet = walletResult.rows[0]
    const newBalance = parseFloat(wallet.balance) + amount

    await query(
      `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, wallet.id]
    )

    // Record the deposit as a payment order
    await query(
      `INSERT INTO payment_orders (user_id, amount, currency, type, status, payment_method)
       VALUES ($1, $2, 'usd', 'deposit', 'completed', 'wallet')
       RETURNING id`,
      [req.user.id, amount]
    )

    console.log(`[Wallet] User ${req.user.email || req.user.id} deposited $${amount}`)

    res.json({
      wallet: { id: wallet.id, balance: newBalance, currency: 'usd' },
      deposited: amount
    })
  } catch (err) {
    console.error('[Wallet] Deposit error:', err)
    res.status(500).json({ error: 'Failed to deposit funds' })
  }
})

// ─────────────────────────────────────────────────
// POST /api/wallet/withdraw — withdraw funds (for creators)
// ─────────────────────────────────────────────────
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, payoutMethod } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' })
    }

    const walletResult = await query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [req.user.id]
    )

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' })
    }

    const wallet = walletResult.rows[0]
    const currentBalance = parseFloat(wallet.balance)

    if (amount > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    if (amount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal is $10' })
    }

    const newBalance = currentBalance - amount

    await query(
      `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, wallet.id]
    )

    // Record the withdrawal
    await query(
      `INSERT INTO payment_orders (user_id, amount, currency, type, status, payment_method)
       VALUES ($1, $2, 'usd', 'withdrawal', 'pending', $3)
       RETURNING id`,
      [req.user.id, amount, payoutMethod || 'manual']
    )

    console.log(`[Wallet] User ${req.user.email || req.user.id} withdrew $${amount}`)

    res.json({
      wallet: { id: wallet.id, balance: newBalance, currency: 'usd' },
      withdrawn: amount,
      payoutMethod: payoutMethod || 'manual',
      status: 'pending'
    })
  } catch (err) {
    console.error('[Wallet] Withdraw error:', err)
    res.status(500).json({ error: 'Failed to withdraw funds' })
  }
})

// ─────────────────────────────────────────────────
// GET /api/wallet/history — transaction history
// ─────────────────────────────────────────────────
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, amount, currency, type, status, payment_method, character_id,
              plan, created_at, metadata
       FROM payment_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    )

    res.json({ transactions: result.rows })
  } catch (err) {
    console.error('[Wallet] History error:', err)
    res.json({ transactions: [] })
  }
})

export default router
