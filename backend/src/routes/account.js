import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { authenticateToken, generateToken } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// ============ Password Reset Tokens (in-memory for dev) ============
const resetTokens = new Map() // email -> { token, expiresAt }

// ============ Notifications (in-memory for dev) ============
const userNotifications = new Map() // userId -> [notification]

function addNotification(userId, type, title, body) {
  if (!userNotifications.has(userId)) {
    userNotifications.set(userId, [])
  }
  const notif = {
    id: crypto.randomUUID(),
    type,
    title,
    body,
    read: false,
    created_at: new Date().toISOString()
  }
  userNotifications.get(userId).unshift(notif)
  return notif
}

// ============ FORGOT PASSWORD ============
// POST /api/account/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check if user exists
    let userExists = true
    try {
      const result = await query('SELECT id, email FROM users WHERE email = $1', [email])
      userExists = result.rows.length > 0
    } catch {
      userExists = false
    }

    // Always return success to prevent email enumeration
    if (!userExists) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' })
    }

    // Generate reset token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString('hex')
    resetTokens.set(email, {
      token,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
    })

    // In production, send email via SendGrid/Resend/etc.
    // For dev, return the reset URL directly
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetUrl = `${frontendUrl}/onlyai-app/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    console.log(`[Account] Password reset link for ${email}: ${resetUrl}`)

    // Store the reset URL so frontend can retrieve it (dev only)
    // In production, this would be sent via email
    res.json({
      message: 'If an account with that email exists, a reset link has been sent.',
      // Dev-only: return the link so frontend can show it
      _devResetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
      _devToken: process.env.NODE_ENV === 'development' ? token : undefined
    })
  } catch (err) {
    console.error('[Account] Forgot password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ RESET PASSWORD ============
// POST /api/account/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body

    if (!email || !token || !password) {
      return res.status(400).json({ error: 'Email, token, and new password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Validate reset token
    const stored = resetTokens.get(email)
    if (!stored || stored.token !== token) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    if (Date.now() > stored.expiresAt) {
      resetTokens.delete(email)
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Update password
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [passwordHash, email])

    // Clean up used token
    resetTokens.delete(email)

    res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' })
  } catch (err) {
    console.error('[Account] Reset password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ PROFILE ============
// GET /api/account/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, avatar_url, bio, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]

    // Get subscription count for display
    const subsResult = await query(
      'SELECT COUNT(*) FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    )
    const activeSubs = parseInt(subsResult.rows[0]?.count || 0)

    res.json({
      user: {
        ...user,
        active_subscriptions: activeSubs
      }
    })
  } catch (err) {
    console.error('[Account] Profile error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/account/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, avatar_url, bio } = req.body

    // Validate username
    if (username !== undefined && (!username || username.trim().length < 1)) {
      return res.status(400).json({ error: 'Username cannot be empty' })
    }

    // Build dynamic update
    const fields = []
    const values = []
    let paramIndex = 1

    if (username !== undefined) {
      fields.push(`username = $${paramIndex++}`)
      values.push(username.trim())
    }
    if (avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`)
      values.push(avatar_url)
    }
    if (bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`)
      values.push(bio)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    fields.push(`updated_at = NOW()`)
    values.push(req.user.id)

    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    // Return updated profile
    const result = await query(
      'SELECT id, email, username, avatar_url, bio, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    )

    res.json({
      user: result.rows[0],
      message: 'Profile updated successfully'
    })
  } catch (err) {
    console.error('[Account] Update profile error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ ACCOUNT DELETION ============
// POST /api/account/deactivate-request
router.post('/deactivate-request', authenticateToken, async (req, res) => {
  try {
    // Check if already requested
    const existing = await query(
      'SELECT deletion_requested_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (existing.rows[0].deletion_requested_at) {
      const requestedAt = new Date(existing.rows[0].deletion_requested_at)
      const daysSinceRequest = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24))
      const remainingDays = Math.max(0, 7 - daysSinceRequest)

      return res.json({
        message: `Deletion already requested. ${remainingDays} days remaining before account will be deleted.`,
        deletion_requested_at: existing.rows[0].deletion_requested_at,
        days_remaining: remainingDays
      })
    }

    // Set deletion request timestamp
    await query(
      'UPDATE users SET deletion_requested_at = NOW(), updated_at = NOW() WHERE id = $1',
      [req.user.id]
    )

    // Add notification
    addNotification(
      req.user.id,
      'system',
      'Account Deletion Scheduled',
      'Your account deletion has been requested. You have 7 days to cancel this request before your account is permanently deleted.'
    )

    res.json({
      message: 'Account deletion has been requested. You have 7 days to cancel before the deletion takes effect.',
      deletion_requested_at: new Date().toISOString(),
      days_remaining: 7
    })
  } catch (err) {
    console.error('[Account] Deactivate request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/account/cancel-deactivation
router.post('/cancel-deactivation', authenticateToken, async (req, res) => {
  try {
    await query(
      "UPDATE users SET deletion_requested_at = NULL, updated_at = NOW() WHERE id = $1",
      [req.user.id]
    )

    addNotification(
      req.user.id,
      'system',
      'Deletion Cancelled',
      'Your account deletion request has been cancelled. Your account is safe.'
    )

    res.json({ message: 'Account deletion request has been cancelled.' })
  } catch (err) {
    console.error('[Account] Cancel deactivation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/account/delete
router.post('/delete', authenticateToken, async (req, res) => {
  try {
    // Check deletion_requested_at
    const result = await query(
      'SELECT deletion_requested_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { deletion_requested_at } = result.rows[0]

    if (!deletion_requested_at) {
      return res.status(400).json({
        error: 'Please request account deletion first. You must wait 7 days before the account can be permanently deleted.',
        needs_request: true
      })
    }

    const requestedAt = new Date(deletion_requested_at)
    const daysSince = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince < 7) {
      const remainingDays = 7 - daysSince
      return res.status(400).json({
        error: `You must wait ${remainingDays} more day(s) before your account can be permanently deleted.`,
        days_remaining: remainingDays,
        deletion_requested_at
      })
    }

    // 7 days passed — delete the account
    // In production, you'd delete all related data too
    await query('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)', [req.user.id])
    await query('DELETE FROM conversations WHERE user_id = $1', [req.user.id])
    await query('DELETE FROM user_profiles WHERE user_id = $1', [req.user.id])
    await query('DELETE FROM subscriptions WHERE user_id = $1', [req.user.id])
    await query('DELETE FROM users WHERE id = $1', [req.user.id])

    res.json({ message: 'Your account has been permanently deleted.' })
  } catch (err) {
    console.error('[Account] Delete error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/account/deletion-status
router.get('/deletion-status', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT deletion_requested_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { deletion_requested_at } = result.rows[0]

    if (!deletion_requested_at) {
      return res.json({ deletion_requested: false })
    }

    const requestedAt = new Date(deletion_requested_at)
    const daysSince = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.max(0, 7 - daysSince)

    res.json({
      deletion_requested: true,
      deletion_requested_at,
      days_remaining: remainingDays,
      eligible_for_deletion: daysSince >= 7
    })
  } catch (err) {
    console.error('[Account] Deletion status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ SETTINGS ============
// GET /api/account/settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT preferred_language, email_notifications, push_enabled, privacy_show_online
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const settings = result.rows[0]

    res.json({
      settings: {
        language: settings.preferred_language || 'en',
        email_notifications: settings.email_notifications !== false,
        push_enabled: settings.push_enabled !== false,
        privacy_show_online: settings.privacy_show_online !== false
      }
    })
  } catch (err) {
    console.error('[Account] Settings error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/account/settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { language, email_notifications, push_enabled, privacy_show_online } = req.body

    const fields = []
    const values = []
    let paramIndex = 1

    if (language !== undefined) {
      const validLanguages = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt']
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: 'Invalid language. Supported: en, zh, ja, ko, es, fr, de, pt' })
      }
      fields.push(`preferred_language = $${paramIndex++}`)
      values.push(language)
    }
    if (email_notifications !== undefined) {
      fields.push(`email_notifications = $${paramIndex++}`)
      values.push(email_notifications)
    }
    if (push_enabled !== undefined) {
      fields.push(`push_enabled = $${paramIndex++}`)
      values.push(push_enabled)
    }
    if (privacy_show_online !== undefined) {
      fields.push(`privacy_show_online = $${paramIndex++}`)
      values.push(privacy_show_online)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No settings to update' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.user.id)

    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    res.json({ message: 'Settings updated successfully' })
  } catch (err) {
    console.error('[Account] Update settings error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ NOTIFICATIONS ============
// GET /api/account/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = userNotifications.get(req.user.id) || []

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length

    res.json({
      notifications: notifications.slice(0, 50), // max 50
      unread_count: unreadCount,
      total: notifications.length
    })
  } catch (err) {
    console.error('[Account] Notifications error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/account/notifications/read-all
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const notifications = userNotifications.get(req.user.id)
    if (notifications) {
      notifications.forEach(n => { n.read = true })
    }
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    console.error('[Account] Mark all read error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/account/notifications/:id/read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const notifications = userNotifications.get(req.user.id)
    if (notifications) {
      const notif = notifications.find(n => n.id === id)
      if (notif) {
        notif.read = true
      }
    }
    res.json({ message: 'Notification marked as read' })
  } catch (err) {
    console.error('[Account] Mark read error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/account/notifications/seed — seed some sample notifications (dev only)
router.post('/notifications/seed', authenticateToken, async (req, res) => {
  try {
    const sampleNotifications = [
      { type: 'system', title: 'Welcome to OnlyAI!', body: 'Thanks for joining! Start by exploring our characters.' },
      { type: 'subscription', title: 'Subscription Active', body: 'Your subscription to Aria is now active. Start chatting!' },
      { type: 'message', title: 'New Message from Yuna', body: 'Yuna sent you a new message. Check your chat!' },
      { type: 'system', title: 'Tip: Set Up Your Profile', body: 'Add a profile picture and bio to personalize your experience.' },
      { type: 'subscription', title: 'Subscription Expiring', body: 'Your subscription to Nova will expire in 3 days.' }
    ]

    sampleNotifications.forEach(n => addNotification(req.user.id, n.type, n.title, n.body))

    res.json({ message: 'Sample notifications added', count: sampleNotifications.length })
  } catch (err) {
    console.error('[Account] Seed notifications error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============ SEARCH ============
// GET /api/account/search?q=
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.trim().length < 1) {
      return res.json({ characters: [], users: [] })
    }

    const query_lower = q.trim().toLowerCase()

    // Search characters (from in-memory list — in prod, query DB)
    const allCharacters = [
      { id: 'yuna', name: 'Yuna', tagline: 'A little elegance, a little mystery ✨', tags: ['#Asian', '#InternationalStudent', '#Elegant', '#Gentle'] },
      { id: 'aria', name: 'Aria', tagline: 'The girl you wish lived next door 💕', tags: ['#Sweet', '#UCLA', '#Warm', '#CollegeGirl'] },
      { id: 'alexandra', name: 'Alexandra', tagline: "She's out of your league... or is she? 👠", tags: ['#NYC', '#Executive', '#Elegant', '#PowerWoman'] },
      { id: 'lucas', name: 'Lucas', tagline: 'The guy who actually listens 📚', tags: ['#BoyNextDoor', '#Columbia', '#DeepTalks', '#Thoughtful'] },
      { id: 'nova', name: 'Nova', tagline: 'Eyes on me. I know you want to. ⭐', tags: ['#Baddie', '#LA', '#Influencer', '#Glam'] },
      { id: 'mason', name: 'Mason', tagline: 'Let me help you become your best self 💪', tags: ['#Fitness', '#VeniceBeach', '#Trainer', '#Motivation'] },
      { id: 'mochi', name: 'Mochi', tagline: 'Shy IRL, wild online. Wanna game? 🐱', tags: ['#Egirl', '#Gamer', '#Twitch', '#Austin'] },
      { id: 'ethan', name: 'Ethan', tagline: 'Let me write you a song', tags: ['#Music', '#NYU', '#Artistic', '#Romantic'] },
      { id: 'sophie', name: 'Sophie', tagline: 'Studying hard... but never too busy for you', tags: ['#College', '#Bookworm', '#Cute', '#Smart'] },
      { id: 'diego', name: 'Diego', tagline: 'Dance with me and feel the rhythm', tags: ['#Latin', '#Dancer', '#Miami', '#Passionate'] },
      { id: 'kai', name: 'Kai', tagline: 'I write code by day... and poetry by night', tags: ['#Tech', '#Engineer', '#SanFrancisco', '#Nerdy'] },
      { id: 'marcus', name: 'Marcus', tagline: 'A gentleman never tells... but I will', tags: ['#Lawyer', '#Chicago', '#Gentleman', '#Sophisticated'] },
      { id: 'jay', name: 'Jay', tagline: 'I spit fire on stage... but I am soft for you', tags: ['#Rapper', '#Atlanta', '#Music', '#Smooth'] },
      { id: 'raven', name: 'Raven', tagline: 'I debug code... and read minds', tags: ['#Tech', '#Programmer', '#Seattle', '#DarkHumor'] },
      { id: 'isabella', name: 'Isabella', tagline: 'Caliente by nature... sweet by choice', tags: ['#Latina', '#Model', '#Miami', '#Passionate'] },
      { id: 'zoe', name: 'Zoe', tagline: 'Catch me at the beach... or catching feelings', tags: ['#Surfer', '#SanDiego', '#Beach', '#Adventurous'] },
      { id: 'lily', name: 'Lily', tagline: 'I close deals... and hearts', tags: ['#VC', '#Investor', '#SanFrancisco', '#Boss'] },
      { id: 'hazel', name: 'Hazel', tagline: 'I capture moments... and hearts', tags: ['#Photographer', '#Denver', '#Creative', '#Nature'] },
      { id: 'sasha', name: 'Sasha', tagline: 'My wardrobe is fire... and so am I', tags: ['#Fashion', '#NYC', '#Trendy', '#Stylish'] },
      { id: 'oliver', name: 'Oliver', tagline: 'I make lattes... and fall in love easily', tags: ['#Barista', '#Seattle', '#Artist', '#Gentle'] }
    ]

    const matchedCharacters = allCharacters.filter(c => {
      const nameLower = c.name.toLowerCase()
      const taglineLower = c.tagline.toLowerCase()
      const tagsText = c.tags.join(' ').toLowerCase()
      return nameLower.includes(query_lower) ||
             taglineLower.includes(query_lower) ||
             tagsText.includes(query_lower.replace('#', ''))
    })

    // Search users
    let matchedUsers = []
    try {
      const userResult = await query(
        `SELECT id, username, avatar_url, bio FROM users
         WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $1
         LIMIT 10`,
        [`%${query_lower}%`]
      )
      matchedUsers = userResult.rows || []
    } catch {
      // Mock mode — search mock users
      matchedUsers = []
    }

    res.json({
      characters: matchedCharacters,
      users: matchedUsers,
      query: q.trim()
    })
  } catch (err) {
    console.error('[Account] Search error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
