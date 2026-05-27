import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  const serverUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://api.onlyai.app'

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  })

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Send a chat message to a character
export function sendChatMessage(characterId, message) {
  if (!socket?.connected) {
    console.warn('[WS] Not connected, cannot send message')
    return false
  }
  socket.emit('chat:message', { characterId, message })
  return true
}

// Listen for AI replies
export function onChatReply(callback) {
  if (!socket) return () => {}
  socket.on('chat:reply', callback)
  return () => socket.off('chat:reply', callback)
}

// Listen for typing indicators
export function onTyping(callback) {
  if (!socket) return () => {}
  socket.on('chat:typing', callback)
  return () => socket.off('chat:typing', callback)
}

// Send typing indicator
export function sendTyping(characterId) {
  if (!socket?.connected) return
  socket.emit('chat:typing', { characterId })
}

// Join a conversation room
export function joinConversation(characterId) {
  if (!socket?.connected) return
  socket.emit('chat:join', { characterId })
}

// Leave a conversation room
export function leaveConversation(characterId) {
  if (!socket?.connected) return
  socket.emit('chat:leave', { characterId })
}
