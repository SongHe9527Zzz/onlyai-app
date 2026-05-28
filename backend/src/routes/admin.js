import { Router } from 'express'
import { authenticateAdmin } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// All admin routes require admin authentication (API key or JWT)
router.use(authenticateAdmin)

// ──────────────────────────────────────────────
//  DASHBOARD / STATS
// ──────────────────────────────────────────────

/**
 * GET /api/admin/stats — Dashboard overview statistics (enhanced)
 */
router.get('/stats', async (req, res) => {
  try {
    // Total users
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users')
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count) || 0

    // New users today
    const newUsersResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE"
    )
    const newUsersToday = parseInt(newUsersResult.rows[0]?.count) || 0

    // New users this week
    const newUsersWeekResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
    )
    const newUsersWeek = parseInt(newUsersWeekResult.rows[0]?.count) || 0

    // New users this month
    const newUsersMonthResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
    )
    const newUsersMonth = parseInt(newUsersMonthResult.rows[0]?.count) || 0

    // Active subscriptions (paid users) — distinct user count
    const paidUsersResult = await query(
      "SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active'"
    )
    const paidUsers = parseInt(paidUsersResult.rows[0]?.count) || 0

    // Total active subscriptions
    const totalSubsResult = await query(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"
    )
    const totalActiveSubs = parseInt(totalSubsResult.rows[0]?.count) || 0

    // MRR — Monthly Recurring Revenue
    // Standard = $7.99/mo, Premium = $15.99/mo
    const mrrResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN plan = 'standard' THEN 7.99 WHEN plan = 'premium' THEN 15.99 ELSE 0 END), 0) as mrr
      FROM subscriptions WHERE status = 'active'
    `)
    const mrr = parseFloat(mrrResult.rows[0]?.mrr) || 0

    // Subscriptions per plan
    const subsByPlanResult = await query(`
      SELECT plan, COUNT(*) as count
      FROM subscriptions WHERE status = 'active'
      GROUP BY plan
    `)

    // Subscriptions per character
    const subsByCharResult = await query(`
      SELECT character_id, COUNT(*) as count
      FROM subscriptions WHERE status = 'active'
      GROUP BY character_id
      ORDER BY count DESC
    `)

    // Users per day (last 7 days) — for chart
    const usersByDayResult = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    // ── DAU / WAU / MAU (approximate from last 7/30 days registration) ──
    // DAU = users registered today (proxy since we don't have login tracking)
    const dau = newUsersToday
    const wau = newUsersWeek
    const mau = newUsersMonth

    // ── Payment conversion rate ──
    const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 10000) / 100 : 0

    // ── Role subscription distribution (premium vs standard) ──
    let planDistribution = { standard: 0, premium: 0, vip: 0, other: 0 }
    if (subsByPlanResult.rows && subsByPlanResult.rows.length > 0) {
      subsByPlanResult.rows.forEach(r => {
        const key = r.plan
        planDistribution[key] = (planDistribution[key] || 0) + parseInt(r.count)
      })
    }
    const premiumPct = totalActiveSubs > 0 ? Math.round((planDistribution.premium / totalActiveSubs) * 100) : 0
    const standardPct = totalActiveSubs > 0 ? Math.round((planDistribution.standard / totalActiveSubs) * 100) : 0

    // ── ARPU (Average Revenue Per Paying User) ──
    const arpu = paidUsers > 0 ? Math.round((mrr / paidUsers) * 100) / 100 : 0

    // ── Content stats ──
    const totalPostsResult = await query("SELECT COUNT(*) as count FROM posts")
    const totalPosts = parseInt(totalPostsResult.rows[0]?.count) || 0
    const removedPostsResult = await query("SELECT COUNT(*) as count FROM posts WHERE status = 'removed'")
    const removedPosts = parseInt(removedPostsResult.rows[0]?.count) || 0
    const pendingReportsResult = await query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'")
    const pendingReports = parseInt(pendingReportsResult.rows[0]?.count) || 0

    res.json({
      // Core counts
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      paidUsers,
      totalActiveSubs,
      mrr: Math.round(mrr * 100) / 100,

      // Plan distribution
      subscriptionsByPlan: subsByPlanResult.rows,
      subscriptionsByCharacter: subsByCharResult.rows,
      usersByDay: usersByDayResult.rows,

      // NEW: Activity metrics
      dau,
      wau,
      mau,

      // NEW: Conversion & revenue
      conversionRate,
      arpu,
      premiumPct,
      standardPct,
      planDistribution,

      // NEW: Content metrics
      totalPosts,
      removedPosts,
      pendingReports,

      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[Admin] Stats error:', err)
    res.json({
      totalUsers: 0, newUsersToday: 0, newUsersWeek: 0, newUsersMonth: 0,
      paidUsers: 0, totalActiveSubs: 0, mrr: 0,
      subscriptionsByPlan: [], subscriptionsByCharacter: [], usersByDay: [],
      dau: 0, wau: 0, mau: 0,
      conversionRate: 0, arpu: 0, premiumPct: 0, standardPct: 0,
      planDistribution: { standard: 0, premium: 0, vip: 0, other: 0 },
      totalPosts: 0, removedPosts: 0, pendingReports: 0,
      timestamp: new Date().toISOString()
    })
  }
})

// ──────────────────────────────────────────────
//  USERS — Enhanced with restriction info
// ──────────────────────────────────────────────

/**
 * GET /api/admin/users — List all users with subscription & restriction info
 */
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const search = req.query.search || ''
    const status = req.query.status || '' // restricted | active | all

    let queryText = `
      SELECT u.id, u.username, u.email, u.created_at,
        COUNT(s.id) FILTER (WHERE s.status = 'active') as active_subs,
        STRING_AGG(DISTINCT s.character_id || ':' || s.plan, ', ') FILTER (WHERE s.status = 'active') as sub_details
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
    `
    let countQueryText = `SELECT COUNT(*) as count FROM users u`
    const queryParams = []
    const conditions = []

    if (search) {
      conditions.push(`(u.username ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1})`)
      queryParams.push(`%${search}%`)
    }

    if (conditions.length > 0) {
      const whereClause = 'WHERE ' + conditions.join(' AND ')
      queryText += ' ' + whereClause
      countQueryText += ' ' + whereClause
    }

    queryText += ` GROUP BY u.id, u.username, u.email, u.created_at ORDER BY u.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
    queryParams.push(limit, offset)

    const usersResult = await query(queryText, queryParams)
    const totalResult = await query(countQueryText, queryParams.slice(0, -2))
    const total = parseInt(totalResult.rows[0]?.count) || 0

    // Enrich users with active restriction status
    const enrichedUsers = []
    for (const user of usersResult.rows) {
      const restrictResult = await query(
        "SELECT id, type, reason, duration_hours, created_at FROM user_restrictions WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1",
        [user.id]
      )
      enrichedUsers.push({
        ...user,
        active_restriction: restrictResult.rows[0] || null
      })
    }

    res.json({
      users: enrichedUsers,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('[Admin] Users list error:', err)
    res.json({ users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
})

/**
 * PATCH /api/admin/users/:id/restrict — Apply restriction (mute/rate-limit/ban)
 * Body: { type: 'mute'|'rate_limit'|'ban', reason: string, duration_hours: number }
 */
router.patch('/users/:id/restrict', async (req, res) => {
  try {
    const userId = req.params.id
    const { type, reason } = req.body
    const durationHours = req.body.duration_hours || 24

    if (!type || !['mute', 'rate_limit', 'ban'].includes(type)) {
      return res.status(400).json({ error: 'Invalid restriction type. Must be: mute, rate_limit, or ban' })
    }

    // First deactivate any existing restrictions for this user
    await query(
      "UPDATE user_restrictions SET active = false WHERE user_id = $1 AND active = true",
      [userId]
    )

    // Insert new restriction
    const result = await query(
      'INSERT INTO user_restrictions (user_id, type, reason, duration_hours, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, type, reason || 'No reason provided', durationHours, req.user?.id || '__admin__']
    )

    res.json({
      success: true,
      restriction: {
        id: result.rows[0]?.id,
        user_id: userId,
        type,
        reason: reason || 'No reason provided',
        duration_hours: durationHours,
        active: true
      },
      message: `User ${type === 'ban' ? 'banned' : type === 'mute' ? 'muted' : 'rate-limited'} for ${durationHours} hours`
    })
  } catch (err) {
    console.error('[Admin] Restrict user error:', err)
    res.status(500).json({ error: 'Failed to apply restriction' })
  }
})

/**
 * DELETE /api/admin/users/:id/restrictions — Lift all restrictions for a user
 */
router.delete('/users/:id/restrictions', async (req, res) => {
  try {
    const userId = req.params.id

    await query(
      "UPDATE user_restrictions SET active = false WHERE user_id = $1 AND active = true",
      [userId]
    )

    res.json({
      success: true,
      message: 'All restrictions lifted for this user'
    })
  } catch (err) {
    console.error('[Admin] Lift restrictions error:', err)
    res.status(500).json({ error: 'Failed to lift restrictions' })
  }
})

// ──────────────────────────────────────────────
//  CONTENT MODERATION (Posts / Feed)
// ──────────────────────────────────────────────

/**
 * GET /api/admin/posts — List all posts (for content moderation)
 * Query: status=published|removed, page, limit, character_id
 */
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const status = req.query.status || ''  // published, removed, or all
    const charId = req.query.character_id || ''

    let queryText = 'SELECT * FROM posts'
    const params = []
    const conditions = []

    if (status && ['published', 'removed', 'pending'].includes(status)) {
      conditions.push(`status = $${params.length + 1}`)
      params.push(status)
    }
    if (charId) {
      conditions.push(`character_id = $${params.length + 1}`)
      params.push(charId)
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ')
    }

    queryText += ' ORDER BY created_at DESC'

    // Count total
    let countText = 'SELECT COUNT(*) as count FROM posts'
    if (conditions.length > 0) {
      countText += ' WHERE ' + conditions.join(' AND ')
    }
    const countResult = await query(countText, [...params])
    const total = parseInt(countResult.rows[0]?.count) || 0

    // Fetch page
    queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    res.json({
      posts: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    console.error('[Admin] Posts list error:', err)
    res.json({ posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
})

/**
 * PATCH /api/admin/posts/:id/status — Update post status
 * Body: { status: 'published' | 'removed' }
 */
router.patch('/posts/:id/status', async (req, res) => {
  try {
    const postId = req.params.id
    const { status } = req.body

    if (!status || !['published', 'removed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: published, removed, or pending' })
    }

    const result = await query(
      'UPDATE posts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      [status, postId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json({
      success: true,
      post: result.rows[0],
      message: status === 'removed' ? 'Content unpublished' : 'Content restored'
    })
  } catch (err) {
    console.error('[Admin] Update post status error:', err)
    res.status(500).json({ error: 'Failed to update post status' })
  }
})

// ──────────────────────────────────────────────
//  REPORT HANDLING
// ──────────────────────────────────────────────

/**
 * GET /api/admin/reports — List content reports
 * Query: status=pending|resolved|dismissed, page, limit
 */
router.get('/reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const status = req.query.status || ''

    let queryText = 'SELECT * FROM reports'
    const params = []
    const conditions = []

    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) {
      conditions.push(`status = $${params.length + 1}`)
      params.push(status)
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ')
    }

    queryText += ' ORDER BY created_at DESC'

    // Count
    let countText = 'SELECT COUNT(*) as count FROM reports'
    if (conditions.length > 0) {
      countText += ' WHERE ' + conditions.join(' AND ')
    }
    const countResult = await query(countText, [...params])
    const total = parseInt(countResult.rows[0]?.count) || 0

    queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    // Enrich reports with post content info
    const enriched = []
    for (const report of result.rows) {
      const postResult = await query('SELECT id, content, author_name, status as post_status FROM posts WHERE id = $1', [String(report.post_id)])
      enriched.push({
        ...report,
        post: postResult.rows[0] || null
      })
    }

    res.json({
      reports: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    console.error('[Admin] Reports list error:', err)
    res.json({ reports: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
})

/**
 * PATCH /api/admin/reports/:id/status — Resolve or dismiss a report
 * Body: { status: 'resolved' | 'dismissed' }
 */
router.patch('/reports/:id/status', async (req, res) => {
  try {
    const reportId = req.params.id
    const { status } = req.body

    if (!status || !['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: resolved or dismissed' })
    }

    const result = await query(
      'UPDATE reports SET status = $1, resolved_at = NOW() WHERE id = $2 RETURNING id, status, resolved_at',
      [status, reportId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    res.json({
      success: true,
      report: result.rows[0],
      message: status === 'resolved' ? 'Report resolved' : 'Report dismissed'
    })
  } catch (err) {
    console.error('[Admin] Update report status error:', err)
    res.status(500).json({ error: 'Failed to update report status' })
  }
})

// ──────────────────────────────────────────────
//  SUBSCRIPTIONS
// ──────────────────────────────────────────────

/**
 * GET /api/admin/subscriptions — List all subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const plan = req.query.plan || ''
    const status = req.query.status || ''

    let queryText = `
      SELECT s.id, s.user_id, s.character_id, s.plan, s.status, s.created_at,
             u.username, u.email
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
    `
    const params = []
    const conditions = []

    if (plan && ['standard', 'premium', 'vip'].includes(plan)) {
      conditions.push(`s.plan = $${params.length + 1}`)
      params.push(plan)
    }
    if (status && ['active', 'cancelled', 'past_due'].includes(status)) {
      conditions.push(`s.status = $${params.length + 1}`)
      params.push(status)
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ')
    }

    queryText += ' ORDER BY s.created_at DESC'

    // Count
    let countText = 'SELECT COUNT(*) as count FROM subscriptions s'
    if (conditions.length > 0) {
      countText += ' WHERE ' + conditions.join(' AND ')
    }
    const countResult = await query(countText, [...params])
    const total = parseInt(countResult.rows[0]?.count) || 0

    queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    res.json({
      subscriptions: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    console.error('[Admin] Subs list error:', err)
    res.json({ subscriptions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
})

// ──────────────────────────────────────────────
//  CHARACTERS
// ──────────────────────────────────────────────

/**
 * GET /api/admin/characters — Character subscription stats
 */
router.get('/characters', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.id, c.name, c.age, c.tagline,
        COUNT(s.id) FILTER (WHERE s.status = 'active') as active_subs,
        COUNT(s.id) FILTER (WHERE s.status = 'active' AND s.plan = 'premium') as premium_subs,
        COUNT(s.id) FILTER (WHERE s.status = 'active' AND s.plan = 'standard') as standard_subs,
        COALESCE(SUM(CASE WHEN s.status = 'active' AND s.plan = 'standard' THEN 7.99 WHEN s.status = 'active' AND s.plan = 'premium' THEN 15.99 ELSE 0 END), 0) as revenue
      FROM characters c
      LEFT JOIN subscriptions s ON s.character_id = c.id
      GROUP BY c.id, c.name, c.age, c.tagline
      ORDER BY active_subs DESC
    `)

    res.json({ characters: result.rows, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Admin] Characters error:', err)
    res.json({ characters: [], timestamp: new Date().toISOString() })
  }
})

// ──────────────────────────────────────────────
//  REVENUE
// ──────────────────────────────────────────────

/**
 * GET /api/admin/revenue — Revenue breakdown by month
 */
router.get('/revenue', async (req, res) => {
  try {
    const revenueByMonth = await query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subs,
        SUM(CASE WHEN plan = 'premium' THEN 15.99 ELSE 7.99 END) as revenue
      FROM subscriptions WHERE status = 'active'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `)

    // Current MRR
    const mrrResult = await query(`
      SELECT COALESCE(SUM(CASE WHEN plan = 'standard' THEN 7.99 WHEN plan = 'premium' THEN 15.99 ELSE 0 END), 0) as mrr
      FROM subscriptions WHERE status = 'active'
    `)

    res.json({
      revenueByMonth: revenueByMonth.rows,
      currentMRR: parseFloat(mrrResult.rows[0]?.mrr) || 0
    })
  } catch (err) {
    console.error('[Admin] Revenue error:', err)
    res.json({ revenueByMonth: [], currentMRR: 0 })
  }
})

export default router
