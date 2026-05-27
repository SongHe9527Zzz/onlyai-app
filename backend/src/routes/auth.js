import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken, generateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Create user
    const result = await query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
      [email, username, passwordHash]
    )

    const user = result.rows[0]
    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }
    })
  } catch (err) {
    console.error('[Auth] Register error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const result = await query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = result.rows[0]

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken(user)

    // Get user's subscriptions
    const subsResult = await query(
      'SELECT id, character_id, plan, status FROM subscriptions WHERE user_id = $1 AND status = $2',
      [user.id, 'active']
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      },
      subscriptions: subsResult.rows
    })
  } catch (err) {
    console.error('[Auth] Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT id, email, username, created_at FROM users WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]

    const subsResult = await query(
      'SELECT id, character_id, plan, status FROM subscriptions WHERE user_id = $1',
      [user.id]
    )

    res.json({
      user,
      subscriptions: subsResult.rows
    })
  } catch (err) {
    console.error('[Auth] Me error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
