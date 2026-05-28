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
import conversationRoutes from './routes/conversations.js'
import paymentRoutes from './routes/payments.js'
import tipRoutes from './routes/tips.js'
import walletRoutes from './routes/wallet.js'
import adminRoutes from './routes/admin.js'
import searchRoutes from './routes/search.js'
import favoriteRoutes from './routes/favorites.js'
import postRoutes from './routes/posts.js'
import accountRoutes from './routes/account.js'
import { setupChatWebSocket } from './websocket/chatHandler.js'
import { initDatabase } from './models/db.js'

const app = express()
const httpServer = createServer(app)

// CORS
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']
app.use(cors({ origin: corsOrigins, credentials: true }))

// ⚠️ Stripe webhook needs raw body BEFORE express.json()
// Only apply raw body parsing to the webhook endpoint
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

// Body parsing for all other routes
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
app.use('/api/conversations', conversationRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/tip', tipRoutes)
app.use('/api/wallet', walletRoutes)

// Search routes
app.use('/api/search', searchRoutes)

// Favorites routes
app.use('/api/favorites', favoriteRoutes)

// Admin routes
app.use('/api/admin', adminRoutes)

// Post routes (feed, likes, comments)
app.use('/api/characters', postRoutes)

// Account routes (profile, settings, password reset, deletion, notifications, search)
app.use('/api/account', accountRoutes)

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
  console.log(`[OnlyAI Server] Stripe: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'dev mode (no key)'}`)
})
