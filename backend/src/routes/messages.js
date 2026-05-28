import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes (/:characterId)

// POST /api/messages/paid — send a paid private message (character to user)
router.post('/paid', authenticateToken, async (req, res) => {
  try {
    const { characterId, content, price } = req.body

    if (!characterId || !content) {
      return res.status(400).json({ error: 'characterId and content are required' })
    }

    // Find conversation between character and user
    const convResult = await query(
      'SELECT id FROM conversations WHERE user_id = $1 AND character_id = $2',
      [req.user.id, characterId]
    )

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'No conversation found. Start a chat first.' })
    }

    const conversationId = convResult.rows[0].id
    const paidPrice = price || 299 // Default $2.99 in cents

    // Save paid message
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, role, content, tokens_used, is_paid, paid_price, is_locked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, role, content, is_paid, paid_price, is_locked, created_at`,
      [conversationId, 'assistant', content, Math.ceil(content.length / 4), true, paidPrice, true]
    )

    res.status(201).json({
      message: {
        ...msgResult.rows[0],
        content: '', // Content hidden until unlocked
        is_locked: true,
        is_unlocked: false
      }
    })
  } catch (err) {
    console.error('[Messages] Paid message error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages/unlock/:msgId — unlock a paid message
router.post('/unlock/:msgId', authenticateToken, async (req, res) => {
  try {
    const msgId = parseInt(req.params.msgId)
    const userId = req.user.id

    // Get the message
    const msgResult = await query(
      'SELECT id, conversation_id, content, paid_price, is_paid, is_locked FROM messages WHERE id = $1',
      [msgId]
    )

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const msg = msgResult.rows[0]

    if (!msg.is_paid) {
      return res.status(400).json({ error: 'This message is not a paid message' })
    }

    if (!msg.is_locked) {
      // Already unlocked — return content
      return res.json({
        success: true,
        content: msg.content,
        message: 'Message already unlocked'
      })
    }

    // Check if already unlocked by this user
    const unlockResult = await query(
      'SELECT id FROM paid_msg_unlocks WHERE message_id = $1 AND user_id = $2',
      [msgId, userId]
    )

    if (unlockResult.rows.length > 0) {
      return res.json({
        success: true,
        content: msg.content,
        message: 'Already unlocked'
      })
    }

    // Verify conversation ownership
    const convResult = await query(
      'SELECT id, user_id FROM conversations WHERE id = $1',
      [msg.conversation_id]
    )

    if (convResult.rows.length === 0 || convResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to unlock this message' })
    }

    // In dev/mock mode — auto-unlock without real payment
    const isDev = !process.env.STRIPE_SECRET_KEY

    if (isDev) {
      // Dev mode: free unlock
      await query(
        'INSERT INTO paid_msg_unlocks (message_id, user_id, amount_paid) VALUES ($1, $2, $3)',
        [msgId, userId, 0]
      )

      await query('UPDATE messages SET is_locked = FALSE WHERE id = $1', [msgId])

      return res.json({
        success: true,
        content: msg.content,
        mode: 'dev',
        message: 'Unlocked (dev mode)'
      })
    }

    // Real payment flow — return payment URL
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30'
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: msg.paid_price,
      currency: 'usd',
      metadata: {
        userId,
        messageId: msgId,
        type: 'paid_message'
      }
    })

    res.json({
      success: true,
      requires_payment: true,
      clientSecret: paymentIntent.client_secret,
      amount: msg.paid_price,
      mode: 'live'
    })
  } catch (err) {
    console.error('[Messages] Unlock error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/messages/read/:characterId — mark all assistant messages as read for a character
router.patch('/read/:characterId', authenticateToken, async (req, res) => {
  try {
    const { characterId } = req.params
    const userId = req.user.id

    const convResult = await query(
      'SELECT id FROM conversations WHERE user_id = $1 AND character_id = $2',
      [userId, characterId]
    )

    if (convResult.rows.length === 0) {
      return res.json({ success: true, count: 0 })
    }

    const conversationId = convResult.rows[0].id

    const updateResult = await query(
      `UPDATE messages SET read_at = NOW()
       WHERE conversation_id = $1 AND role = 'assistant' AND read_at IS NULL
       RETURNING id`,
      [conversationId]
    )

    res.json({
      success: true,
      count: updateResult.rowCount || 0
    })
  } catch (err) {
    console.error('[Messages] Mark read error:', err)
    res.json({ success: true, count: 0 })
  }
})

// GET /api/messages/paid/available — list all paid messages available for unlock
router.get('/paid/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    // Get all conversations for user
    const convResult = await query(
      'SELECT id, character_id FROM conversations WHERE user_id = $1',
      [userId]
    )

    if (convResult.rows.length === 0) {
      return res.json({ paid_messages: [] })
    }

    const convIds = convResult.rows.map(c => c.id)

    // Find paid locked messages
    const msgResult = await query(
      `SELECT m.id, m.content, m.paid_price, m.created_at, c.character_id
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.conversation_id = ANY($1) AND m.is_paid = TRUE AND m.is_locked = TRUE
       ORDER BY m.created_at DESC`,
      [convIds]
    )

    // Check which are already unlocked
    const paidMessages = []
    for (const msg of msgResult.rows) {
      const unlockResult = await query(
        'SELECT id FROM paid_msg_unlocks WHERE message_id = $1 AND user_id = $2',
        [msg.id, userId]
      )
      paidMessages.push({
        id: msg.id,
        character_id: msg.character_id,
        content: unlockResult.rows.length > 0 ? msg.content : null,
        paid_price: msg.paid_price,
        is_unlocked: unlockResult.rows.length > 0,
        created_at: msg.created_at
      })
    }

    res.json({ paid_messages: paidMessages })
  } catch (err) {
    console.error('[Messages] Available paid messages error:', err)
    res.json({ paid_messages: [] })
  }
})

// ── PARAMETERIZED ROUTES (must come after specific routes) ──

// GET /api/messages/:characterId — get conversation history
router.get('/:characterId', authenticateToken, async (req, res) => {
  try {
    const { characterId } = req.params
    const limit = parseInt(req.query.limit) || 50

    // Find conversation
    const convResult = await query(
      'SELECT id FROM conversations WHERE user_id = $1 AND character_id = $2',
      [req.user.id, characterId]
    )

    if (convResult.rows.length === 0) {
      return res.json({ messages: [] })
    }

    const conversationId = convResult.rows[0].id

    // Get messages with all fields
    const msgResult = await query(
      `SELECT id, role, content, tokens_used, is_paid, paid_price, is_locked, read_at, msg_metadata, created_at
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

    // Check which paid messages user has unlocked
    const allMsgIds = msgResult.rows.filter(m => m.is_paid).map(m => m.id)
    const unlockedIds = new Set()
    for (const msgId of allMsgIds) {
      const unlockResult = await query(
        'SELECT id FROM paid_msg_unlocks WHERE message_id = $1 AND user_id = $2',
        [msgId, req.user.id]
      )
      if (unlockResult.rows.length > 0) {
        unlockedIds.add(msgId)
      }
    }

    // Build response: mask locked paid message content
    const messages = msgResult.rows.map(msg => {
      const isUnlocked = !msg.is_paid || !msg.is_locked || unlockedIds.has(msg.id)
      return {
        id: msg.id,
        role: msg.role,
        content: isUnlocked ? msg.content : '',
        is_paid: msg.is_paid || false,
        paid_price: msg.paid_price || 0,
        is_locked: msg.is_paid ? !isUnlocked : false,
        is_unlocked: isUnlocked,
        read_at: msg.read_at,
        tokens_used: msg.tokens_used,
        created_at: msg.created_at
      }
    })

    // Auto-mark assistant messages as read when fetched
    try {
      await query(
        `UPDATE messages SET read_at = NOW()
         WHERE conversation_id = $1 AND role = 'assistant' AND read_at IS NULL AND is_paid = FALSE`,
        [conversationId]
      )
    } catch (e) {
      // Non-critical
    }

    res.json({
      messages,
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
