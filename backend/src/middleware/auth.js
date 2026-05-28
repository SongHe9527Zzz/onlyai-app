import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'onlyai-dev-secret-key-2026'

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username
    }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  // Check admin API key (simpler for self-hosted admin)
  const adminKey = req.headers['x-admin-key']
  const configuredKey = process.env.ADMIN_API_KEY

  if (configuredKey && adminKey === configuredKey) {
    req.user = req.user || { id: '__admin__', isAdmin: true }
    return next()
  }

  // Check JWT admin claim
  if (req.user && req.user.isAdmin) {
    return next()
  }

  // Fallback: check environment variable for admin email
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
  if (req.user && adminEmails.includes(req.user.email)) {
    return next()
  }

  return res.status(403).json({ error: 'Admin access required' })
}

/**
 * Combined admin auth: accepts either x-admin-key header (no JWT needed)
 * OR a valid JWT with admin role.
 * This is the preferred middleware for admin API routes.
 */
export function authenticateAdmin(req, res, next) {
  // 1) Check admin API key first (no JWT required)
  const adminKey = req.headers['x-admin-key']
  const configuredKey = process.env.ADMIN_API_KEY

  if (configuredKey && adminKey === configuredKey) {
    req.user = { id: '__admin__', isAdmin: true }
    return next()
  }

  // 2) Fall back to JWT authentication
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required. Provide x-admin-key or Bearer token.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      isAdmin: decoded.isAdmin || false
    }

    // Check admin claim or admin email
    if (req.user.isAdmin) {
      return next()
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
    if (adminEmails.includes(req.user.email)) {
      req.user.isAdmin = true
      return next()
    }

    return res.status(403).json({ error: 'Admin access required' })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin || false
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}
