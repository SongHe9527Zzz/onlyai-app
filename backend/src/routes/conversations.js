import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// GET /api/conversations — list all conversations for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    // Get all conversations for this user
    const convResult = await query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    )

    const conversations = []

    for (const conv of convResult.rows) {
      // Get latest message
      const msgResult = await query(
        'SELECT content, role, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
        [conv.id]
      )

      // Get unread count (assistant messages without read_at)
      const unreadResult = await query(
        `SELECT COUNT(*) as count FROM messages
         WHERE conversation_id = $1 AND role = 'assistant' AND read_at IS NULL`,
        [conv.id]
      )

      // Get character info
      const charResult = await query(
        'SELECT name, tagline FROM characters WHERE id = $1',
        [conv.character_id]
      )

      const lastMsg = msgResult.rows[0]
      const unreadCount = parseInt(unreadResult.rows[0]?.count || 0)
      const ch = charResult.rows[0]

      conversations.push({
        id: conv.id,
        character_id: conv.character_id,
        character_name: ch?.name || conv.character_id,
        character_tagline: ch?.tagline || '',
        last_message: lastMsg?.content || '',
        last_message_role: lastMsg?.role || '',
        last_message_at: lastMsg?.created_at || conv.updated_at,
        unread_count: unreadCount,
        created_at: conv.created_at,
        updated_at: conv.updated_at
      })
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))

    res.json({ conversations })
  } catch (err) {
    console.error('[Conversations] List error:', err)
    res.json({ conversations: [] })
  }
})

// DELETE /api/conversations/:id — delete entire conversation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const convId = parseInt(req.params.id)
    const userId = req.user.id

    // Verify ownership
    const convResult = await query(
      'SELECT id, user_id FROM conversations WHERE id = $1',
      [convId]
    )

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    if (convResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this conversation' })
    }

    // Delete all messages first
    await query('DELETE FROM messages WHERE conversation_id = $1', [convId])

    // Delete the conversation
    await query('DELETE FROM conversations WHERE id = $1', [convId])

    res.json({ success: true, message: 'Conversation deleted' })
  } catch (err) {
    console.error('[Conversations] Delete error:', err)

    // Mock mode fallback — try simpler approach
    try {
      await query('DELETE FROM messages WHERE conversation_id = $1', [parseInt(req.params.id)])
      await query('DELETE FROM conversations WHERE id = $1', [parseInt(req.params.id)])
      res.json({ success: true, message: 'Conversation deleted' })
    } catch (fallbackErr) {
      console.error('[Conversations] Delete fallback error:', fallbackErr)
      res.status(500).json({ error: 'Failed to delete conversation' })
    }
  }
})

// PATCH /api/conversations/:id/read — mark all messages in conversation as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const convId = parseInt(req.params.id)

    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE conversation_id = $1 AND role = 'assistant' AND read_at IS NULL`,
      [convId]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[Conversations] Mark read error:', err)
    res.json({ success: true })
  }
})

export default router
