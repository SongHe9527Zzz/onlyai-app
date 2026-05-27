import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// GET /api/subscriptions — get user's subscriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, character_id, plan, status, created_at FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    )
    res.json({ subscriptions: result.rows })
  } catch (err) {
    console.error('[Subs] List error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/subscriptions — create a subscription
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { characterId, plan, price } = req.body

    if (!characterId || !plan) {
      return res.status(400).json({ error: 'characterId and plan are required' })
    }

    // Check if already subscribed
    const existing = await query(
      'SELECT id FROM subscriptions WHERE user_id = $1 AND character_id = $2 AND status = $3',
      [req.user.id, characterId, 'active']
    )

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already subscribed to this character' })
    }

    // Create subscription
    const result = await query(
      `INSERT INTO subscriptions (user_id, character_id, plan, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, character_id, plan, status, created_at`,
      [req.user.id, characterId, plan]
    )

    // Also create or ensure conversation exists
    await query(
      `INSERT INTO conversations (user_id, character_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, character_id) DO NOTHING`,
      [req.user.id, characterId]
    )

    res.status(201).json({ subscription: result.rows[0] })
  } catch (err) {
    console.error('[Subs] Create error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/subscriptions/:id — cancel a subscription
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, status`,
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    res.json({ subscription: result.rows[0] })
  } catch (err) {
    console.error('[Subs] Cancel error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
