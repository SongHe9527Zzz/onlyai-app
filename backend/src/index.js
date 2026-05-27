import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import jwt from 'jsonwebtoken'

import authRoutes from './routes/auth.js'
import characterRoutes from './routes/characters.js'
import subscriptionRoutes from './routes/subscriptions.js'
import messageRoutes from './routes/messages.js'
import { setupChatWebSocket } from './websocket/chatHandler.js'
import { initDatabase } from './models/db.js'

const app = express()
const httpServer = createServer(app)

// CORS
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']
app.use(cors({ origin: corsOrigins, credentials: true }))

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/characters', characterRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/messages', messageRoutes)

// Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: { origin: corsOrigins, credentials: true },
  transports: ['websocket', 'polling']
})

// Auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    return next(new Error('Authentication required'))
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.userId
    socket.userEmail = decoded.email
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
})

setupChatWebSocket(io)

// Database init (non-blocking on failure)
try {
  await initDatabase()
  console.log('[DB] Database initialized')
} catch (err) {
  console.warn('[DB] Database not available, running in mock mode:', err.message)
}

// Start server
const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`[OnlyAI Server] Running on http://localhost:${PORT}`)
  console.log(`[OnlyAI Server] Environment: ${process.env.NODE_ENV}`)
})
