import { query } from '../models/db.js'
import { generateReply } from '../services/aiService.js'
import { buildContext } from '../services/memoryService.js'

// In-memory room tracking
const characterRooms = new Map()

export function setupChatWebSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.userId
    console.log(`[WS] User ${userId} connected (socket: ${socket.id})`)

    // Join a character conversation room
    socket.on('chat:join', async ({ characterId }) => {
      if (!characterId) return

      const room = `char:${characterId}`
      socket.join(room)

      if (!characterRooms.has(room)) {
        characterRooms.set(room, new Set())
      }
      characterRooms.get(room).add(socket.id)

      // Ensure conversation exists in DB
      try {
        await query(
          `INSERT INTO conversations (user_id, character_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, character_id) DO UPDATE SET updated_at = NOW()`,
          [userId, characterId]
        )
      } catch (err) {
        // Mock mode — silently continue
      }

      console.log(`[WS] User ${userId} joined room ${room}`)
    })

    // Leave a conversation room
    socket.on('chat:leave', ({ characterId }) => {
      if (!characterId) return

      const room = `char:${characterId}`
      socket.leave(room)

      if (characterRooms.has(room)) {
        characterRooms.get(room).delete(socket.id)
        if (characterRooms.get(room).size === 0) {
          characterRooms.delete(room)
        }
      }
    })

    // Handle chat message
    socket.on('chat:message', async ({ characterId, message }) => {
      if (!characterId || !message) return

      console.log(`[WS] Chat from ${userId} to ${characterId}: "${message.substring(0, 50)}..."`)

      // Broadcast typing indicator to others in the room
      socket.to(`char:${characterId}`).emit('chat:typing', {
        characterId,
        isTyping: true
      })

      try {
        // Save user message
        await saveMessage(userId, characterId, 'user', message)

        // Build context from memory layers
        const context = await buildContext(userId, characterId)

        // Generate AI reply
        const reply = await generateReply(characterId, message, context)

        // Save AI reply
        await saveMessage(userId, characterId, 'assistant', reply)

        // Send reply back to the user
        socket.emit('chat:reply', {
          characterId,
          message: reply
        })

        // Stop typing indicator
        socket.emit('chat:typing', {
          characterId,
          isTyping: false
        })

      } catch (err) {
        console.error('[WS Chat] Error:', err.message)

        // Fall back to mock reply
        const { getCharacterReplies } = await import('../services/memoryService.js')
        const replies = getCharacterReplies(characterId)
        const fallbackReply = replies[Math.floor(Math.random() * replies.length)]

        // Save fallback
        try {
          await saveMessage(userId, characterId, 'assistant', fallbackReply)
        } catch {}

        socket.emit('chat:reply', {
          characterId,
          message: fallbackReply
        })

        socket.emit('chat:typing', {
          characterId,
          isTyping: false
        })
      }
    })

    // Handle typing indicator
    socket.on('chat:typing', ({ characterId }) => {
      socket.to(`char:${characterId}`).emit('chat:typing', {
        characterId,
        isTyping: true
      })

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        socket.to(`char:${characterId}`).emit('chat:typing', {
          characterId,
          isTyping: false
        })
      }, 3000)
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[WS] User ${userId} disconnected (socket: ${socket.id})`)
      // Remove from all rooms
      for (const [room, members] of characterRooms) {
        if (members.has(socket.id)) {
          members.delete(socket.id)
          if (members.size === 0) {
            characterRooms.delete(room)
          }
        }
      }
    })
  })
}

async function saveMessage(userId, characterId, role, content) {
  try {
    // Find or create conversation
    const convResult = await query(
      `INSERT INTO conversations (user_id, character_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, character_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [userId, characterId]
    )

    const conversationId = convResult.rows[0].id

    // Save the message
    await query(
      `INSERT INTO messages (conversation_id, role, content, tokens_used)
       VALUES ($1, $2, $3, $4)`,
      [conversationId, role, content, Math.ceil(content.length / 4)]
    )
  } catch (err) {
    // Mock/offline mode — just log
    console.warn('[WS] Save message (mock):', role, content.substring(0, 30))
  }
}
