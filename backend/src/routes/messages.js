import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// GET /api/messages/:characterId — get conversation history
router.get('/:characterId', authenticateToken, async (req, res) => {
  try {
    const { characterId } = req.params
    const limit = parseInt(req.query.limit) || 30

    // Find conversation
    const convResult = await query(
      'SELECT id FROM conversations WHERE user_id = $1 AND character_id = $2',
      [req.user.id, characterId]
    )

    if (convResult.rows.length === 0) {
      return res.json({ messages: [] })
    }

    const conversationId = convResult.rows[0].id

    // Get messages
    const msgResult = await query(
      `SELECT id, role, content, tokens_used, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, limit]
    )

    // Get user profile memory
    const profileResult = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1 AND character_id = $2',
      [req.user.id, characterId]
    )

    res.json({
      messages: msgResult.rows,
      profile: profileResult.rows[0] || null
    })
  } catch (err) {
    console.error('[Messages] Get error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages/:characterId — save a message (REST fallback)
router.post('/:characterId', authenticateToken, async (req, res) => {
  try {
    const { characterId } = req.params
    const { role, content } = req.body

    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' })
    }

    // Ensure conversation exists
    const convResult = await query(
      `INSERT INTO conversations (user_id, character_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, character_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [req.user.id, characterId]
    )

    const conversationId = convResult.rows[0].id

    // Save message
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, role, content, tokens_used)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role, content, created_at`,
      [conversationId, role, content, Math.ceil(content.length / 4)]
    )

    res.status(201).json({ message: msgResult.rows[0] })
  } catch (err) {
    console.error('[Messages] Post error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
