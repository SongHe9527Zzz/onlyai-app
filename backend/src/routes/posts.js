import { Router } from 'express'
import { authenticateAdmin } from '../middleware/auth.js'
import { query } from '../models/db.js'

const router = Router()

// Character list (mirrors frontend data)
const characters = [
  'aria', 'yuna', 'alexandra', 'lucas', 'nova', 'mason', 'mochi',
  'ethan', 'sophie', 'diego', 'kai', 'marcus', 'jay', 'raven',
  'isabella', 'zoe', 'lily', 'hazel', 'sasha', 'oliver'
]

function charExists(id) {
  return characters.includes(id)
}

/**
 * GET /api/characters/:id/posts — List posts for a character
 * Query params: ?type=free|subscriber|ppv&page=1&limit=20
 */
router.get('/:id/posts', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!charExists(id)) return res.status(404).json({ error: 'Character not found' })

    const type = req.query.type || null
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    const result = await query(
      `SELECT * FROM character_posts WHERE character_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )

    // Parse image_urls for each post
    const posts = (result.rows || []).map(p => {
      try { p.imageUrls = JSON.parse(p.image_urls || '[]') } catch { p.imageUrls = [] }
      delete p.image_urls
      return p
    })

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1`,
      [id]
    )
    const total = parseInt(countResult.rows[0]?.count) || 0

    res.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    console.error('[Posts] List error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/characters/:id/posts/stats — Publishing statistics for a character
 */
router.get('/:id/posts/stats', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!charExists(id)) return res.status(404).json({ error: 'Character not found' })

    // Total
    const totalR = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1`, [id]
    )
    const totalPosts = parseInt(totalR.rows[0]?.count) || 0

    // By type
    const typeR = await query(
      `SELECT type, COUNT(*) as count FROM character_posts WHERE character_id = $1 GROUP BY type`, [id]
    )

    // Posts this week
    const weekR = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`, [id]
    )
    const postsThisWeek = parseInt(weekR.rows[0]?.count) || 0

    // Posts this month
    const monthR = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`, [id]
    )
    const postsThisMonth = parseInt(monthR.rows[0]?.count) || 0

    // Scheduled posts
    const schedR = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1 AND scheduled_at IS NOT NULL AND scheduled_at > NOW()`, [id]
    )
    const scheduledPosts = parseInt(schedR.rows[0]?.count) || 0

    // Published
    const pubR = await query(
      `SELECT COUNT(*) as count FROM character_posts WHERE character_id = $1 AND (scheduled_at IS NULL OR scheduled_at <= NOW())`, [id]
    )
    const publishedPosts = parseInt(pubR.rows[0]?.count) || 0

    // Engagement
    const engR = await query(
      `SELECT COALESCE(SUM(likes), 0) as total_likes, COALESCE(SUM(comments), 0) as total_comments FROM character_posts WHERE character_id = $1`, [id]
    )
    const totalLikes = parseInt(engR.rows[0]?.total_likes) || 0
    const totalComments = parseInt(engR.rows[0]?.total_comments) || 0

    // Posts by day (last 7)
    const byDayR = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM character_posts WHERE character_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date ASC`, [id]
    )

    res.json({
      totalPosts,
      postsByType: typeR.rows || [],
      postsThisWeek,
      postsThisMonth,
      scheduledPosts,
      publishedPosts,
      totalLikes,
      totalComments,
      postsByDay: byDayR.rows || [],
      characterId: id
    })
  } catch (err) {
    console.error('[Posts] Stats error:', err)
    res.json({
      totalPosts: 0, postsByType: [], postsThisWeek: 0, postsThisMonth: 0,
      scheduledPosts: 0, publishedPosts: 0, totalLikes: 0, totalComments: 0,
      postsByDay: [], characterId: req.params.id
    })
  }
})

/**
 * POST /api/characters/:id/posts — Create a new post
 */
router.post('/:id/posts', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!charExists(id)) return res.status(404).json({ error: 'Character not found' })

    const { type, content, imageUrls, ppvPrice, scheduledAt, locked } = req.body

    if (!type || !['free', 'subscriber', 'ppv'].includes(type)) {
      return res.status(400).json({ error: 'Valid type required: free, subscriber, or ppv' })
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }
    if (type === 'ppv' && (!ppvPrice || ppvPrice <= 0)) {
      return res.status(400).json({ error: 'PPV price must be > 0' })
    }

    const imageUrlsStr = Array.isArray(imageUrls) ? JSON.stringify(imageUrls) : '[]'
    const actualLocked = locked !== undefined ? locked : (type !== 'free')

    const result = await query(
      `INSERT INTO character_posts (character_id, type, ppv_price, content, image_urls, likes, comments, locked, scheduled_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, NOW()) RETURNING *`,
      [id, type, type === 'ppv' ? (ppvPrice || 0) : 0, content.trim(), imageUrlsStr, actualLocked, scheduledAt || null]
    )

    const post = result.rows[0]
    if (post) {
      try { post.imageUrls = JSON.parse(post.image_urls || '[]') } catch { post.imageUrls = [] }
      delete post.image_urls
    }

    res.status(201).json({ post })
  } catch (err) {
    console.error('[Posts] Create error:', err)
    res.status(500).json({ error: 'Internal server error: ' + err.message })
  }
})

/**
 * PUT /api/characters/:id/posts/:postId — Edit a post
 */
router.put('/:id/posts/:postId', authenticateAdmin, async (req, res) => {
  try {
    const { id, postId } = req.params
    if (!charExists(id)) return res.status(404).json({ error: 'Character not found' })

    // Verify post exists
    const existing = await query(
      `SELECT * FROM character_posts WHERE id = $1 AND character_id = $2`, [parseInt(postId), id]
    )
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const { type, content, imageUrls, ppvPrice, scheduledAt, locked } = req.body
    const updates = []
    const params = []
    let idx = 1

    if (type !== undefined) {
      if (!['free', 'subscriber', 'ppv'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' })
      }
      updates.push(`type = $${idx++}`)
      params.push(type)
    }
    if (content !== undefined) {
      updates.push(`content = $${idx++}`)
      params.push(content.trim())
    }
    if (imageUrls !== undefined) {
      updates.push(`image_urls = $${idx++}`)
      params.push(JSON.stringify(imageUrls))
    }
    if (ppvPrice !== undefined) {
      updates.push(`ppv_price = $${idx++}`)
      params.push(ppvPrice)
    }
    if (locked !== undefined) {
      updates.push(`locked = $${idx++}`)
      params.push(locked)
    }
    if (scheduledAt !== undefined) {
      updates.push(`scheduled_at = $${idx++}`)
      params.push(scheduledAt || null)
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(parseInt(postId))
    const result = await query(
      `UPDATE character_posts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )

    const post = result.rows[0]
    if (post) {
      try { post.imageUrls = JSON.parse(post.image_urls || '[]') } catch { post.imageUrls = [] }
      delete post.image_urls
    }
    res.json({ post })
  } catch (err) {
    console.error('[Posts] Update error:', err)
    res.status(500).json({ error: 'Internal server error: ' + err.message })
  }
})

/**
 * DELETE /api/characters/:id/posts/:postId — Delete a post
 */
router.delete('/:id/posts/:postId', authenticateAdmin, async (req, res) => {
  try {
    const { id, postId } = req.params
    if (!charExists(id)) return res.status(404).json({ error: 'Character not found' })

    const existing = await query(
      `SELECT * FROM character_posts WHERE id = $1 AND character_id = $2`, [parseInt(postId), id]
    )
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Post not found' })
    }

    await query(`DELETE FROM character_posts WHERE id = $1`, [parseInt(postId)])
    res.json({ success: true, deleted: parseInt(postId) })
  } catch (err) {
    console.error('[Posts] Delete error:', err)
    res.status(500).json({ error: 'Internal server error: ' + err.message })
  }
})

export default router
