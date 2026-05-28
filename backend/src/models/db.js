import pg from 'pg'

let pool = null

export async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl === 'postgresql://localhost:5432/onlyai') {
    // No real DB configured — run in mock mode
    console.log('[DB] No database URL configured, using in-memory mock')
    seedMockData()
    return
  }

  pool = new pg.Pool({ connectionString: databaseUrl })

  // Test connection
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }

  // Run migrations
  await runMigrations()
}

async function runMigrations() {
  const sql = `
    -- Characters table
    CREATE TABLE IF NOT EXISTS characters (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      age INT,
      tagline TEXT,
      persona TEXT NOT NULL DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      sub_count INT DEFAULT 0,
      post_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(64) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      deleted BOOLEAN DEFAULT FALSE,
      deletion_requested_at TIMESTAMP DEFAULT NULL,
      preferred_language VARCHAR(8) DEFAULT 'en',
      email_notifications BOOLEAN DEFAULT TRUE,
      push_enabled BOOLEAN DEFAULT TRUE,
      privacy_show_online BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Conversations table (per user per character)
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      character_id VARCHAR(32) NOT NULL REFERENCES characters(id),
      status VARCHAR(16) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, character_id)
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES conversations(id),
      role VARCHAR(16) NOT NULL,
      content TEXT NOT NULL,
      tokens_used INT DEFAULT 0,
      is_paid BOOLEAN DEFAULT FALSE,
      paid_price INT DEFAULT 0,
      is_locked BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP,
      msg_metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);

    -- User profiles table (per character memory)
    CREATE TABLE IF NOT EXISTS user_profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      character_id VARCHAR(32) NOT NULL REFERENCES characters(id),
      user_name VARCHAR(64),
      facts JSONB DEFAULT '{}',
      relationship VARCHAR(32) DEFAULT 'new',
      summary TEXT,
      preferences JSONB DEFAULT '{}',
      last_active TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, character_id)
    );

    -- Paid message unlocks table
    CREATE TABLE IF NOT EXISTS paid_msg_unlocks (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT NOT NULL REFERENCES messages(id),
      user_id UUID NOT NULL REFERENCES users(id),
      amount_paid INT NOT NULL,
      unlocked_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    );

    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      character_id VARCHAR(32) NOT NULL REFERENCES characters(id),
      plan VARCHAR(32) NOT NULL DEFAULT 'standard',
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      stripe_subscription_id VARCHAR(255),
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subs_char ON subscriptions(character_id);

    -- Account system migrations (idempotent)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP DEFAULT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(8) DEFAULT 'en';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_show_online BOOLEAN DEFAULT TRUE;
  `

  // Split and run each statement
  for (const stmt of sql.split(';').filter(s => s.trim())) {
    try {
      await pool.query(stmt + ';')
    } catch (err) {
      console.warn('[DB Migration] Statement failed:', err.message)
    }
  }
}

export function getPool() {
  return pool
}

// ============ In-Memory Mock for Development ============

// ─── Seed characters into mock DB for foreign key consistency ───
const MOCK_CHARACTER_IDS = ['aria', 'yuna', 'alexandra', 'lucas', 'nova', 'mason', 'mochi']

const mockDb = {
  users: [],
  conversations: [],
  messages: [],
  userProfiles: [],
  subscriptions: [],
  posts: [],
  reports: [],
  userRestrictions: [],
  nextConvId: 1,
  nextMsgId: 1,
  nextSubId: 1,
  nextProfileId: 1,
  paidMsgUnlocks: [],
  nextPostId: 1,
  nextCharacterPostId: 1,
  characterPosts: [],
  nextReportId: 1,
  nextUnlockId: 1,
  payment_orders: [],
  tips: [],
  wallets: [],
  nextOrderId: 1,
  nextTipId: 1,
  nextRestrictionId: 1,
  seeded: false
}

// ─── Seed demo character posts for content publishing UI ───
  if (mockDb.characterPosts.length === 0) {
    const charIds = ['aria', 'yuna', 'nova', 'alexandra', 'lucas', 'mason', 'mochi']
    const postTypes = ['free', 'subscriber', 'ppv']
    const demoCharacterPosts = [
      { content: 'Just got home from class... finally in my cozy hoodie 🥰 what are you up to?', likes: 124, comments: 18 },
      { content: 'New outfit drop! What do you think? 💕', likes: 89, comments: 12 },
      { content: 'Late night studying... wish you were here 📚✨', likes: 56, comments: 8 },
      { content: 'Exclusive content for my subscribers only 😘', likes: 234, comments: 43, type: 'subscriber' },
      { content: 'You won\'t believe what happened today 🙈', likes: 67, comments: 9 },
      { content: 'Behind the scenes of my latest photoshoot 📸', likes: 145, comments: 22, type: 'subscriber' },
      { content: 'Pay-per-view: Special set just for you 🔥', likes: 312, comments: 56, type: 'ppv', ppvPrice: 9.99 },
      { content: 'Morning coffee ☕️ thinking about you...', likes: 78, comments: 11 },
      { content: 'New hairstyle! Do you like it? 🎀', likes: 92, comments: 15 },
      { content: 'Feeling a little naughty today... 😈', likes: 189, comments: 34, type: 'subscriber' },
      { content: 'Q&A time! Ask me anything 💭', likes: 45, comments: 7 },
      { content: 'PPV special: You asked for this 👀', likes: 278, comments: 48, type: 'ppv', ppvPrice: 14.99 },
      { content: 'Instagram vs reality 😂', likes: 210, comments: 31 },
      { content: 'Cozy night in with my favorite person 🥺', likes: 97, comments: 14 },
      { content: 'New chapter unlocked... guess what? 👀', likes: 156, comments: 27, type: 'subscriber' }
    ]

    demoCharacterPosts.forEach((item, i) => {
      const charId = charIds[i % charIds.length]
      const type = item.type || 'free'
      const daysAgo = Math.floor(Math.random() * 30)
      const createdDate = new Date()
      createdDate.setDate(createdDate.getDate() - daysAgo)
      createdDate.setHours(Math.floor(Math.random() * 24))

      mockDb.characterPosts.push({
        id: mockDb.nextCharacterPostId++,
        character_id: charId,
        type: type,
        ppv_price: item.ppvPrice || 0,
        content: item.content,
        image_urls: JSON.stringify([]),
        likes: item.likes || Math.floor(Math.random() * 100),
        comments: item.comments || Math.floor(Math.random() * 20),
        locked: type !== 'free',
        scheduled_at: null,
        created_at: createdDate
      })
    })
  }

  // ─── Seed demo posts/reports for content moderation UI ───
export function seedMockData() {
  if (mockDb.seeded) return
  mockDb.seeded = true

  const demoContent = [
    { content: 'New outfit drop today! Check out my latest look ✨', status: 'published' },
    { content: 'Late night vibes with my favorite playlist 🎵', status: 'published' },
    { content: 'Just hit 10k followers! Love you all 💕', status: 'published' },
    { content: 'Behind the scenes of my latest photoshoot 📸', status: 'published' },
    { content: 'New exclusive content coming this weekend 😘', status: 'published' },
    { content: 'POV: You caught me at the gym 💪', status: 'published' },
    { content: 'Free onlyfans link in bio? NO ty.', status: 'removed' },
    { content: 'Hot singles in your area — click here!', status: 'removed' },
    { content: 'Check out this shady site for free stuff', status: 'removed' },
    { content: 'My favorite coffee spot in the city ☕ #ootd', status: 'published' },
    { content: 'Q&A time! Ask me anything 💭', status: 'published' },
    { content: 'New chapter unlocked... guess what? 👀', status: 'published' },
    { content: 'DM me for special prices 🤑', status: 'removed' },
    { content: 'Working on something special for you all 🤫', status: 'published' },
    { content: 'Weekend getaway pictures are up! 🏖️', status: 'published' }
  ]

  const charIds = ['aria', 'yuna', 'nova', 'alexandra', 'lucas', 'mason', 'mochi']
  const charNames = { aria: 'Aria', yuna: 'Yuna', nova: 'Nova', alexandra: 'Alexandra', lucas: 'Lucas', mason: 'Mason', mochi: 'Mochi' }

  // Create mock users if none exist yet
  if (mockDb.users.length === 0) {
    const mockUsers = [
      { id: 'user-seed-001', username: 'sweet_aria', email: 'aria@demo.com', password_hash: '$2a$10$dummy', created_at: new Date(Date.now() - 86400000 * 5) },
      { id: 'user-seed-002', username: 'yuna_fan', email: 'yuna@demo.com', password_hash: '$2a$10$dummy', created_at: new Date(Date.now() - 86400000 * 3) },
      { id: 'user-seed-003', username: 'nova_star', email: 'nova@demo.com', password_hash: '$2a$10$dummy', created_at: new Date(Date.now() - 86400000 * 1) },
      { id: 'user-seed-004', username: 'alex_business', email: 'alex@demo.com', password_hash: '$2a$10$dummy', created_at: new Date(Date.now() - 86400000 * 7) },
      { id: 'user-seed-005', username: 'lucas_dream', email: 'lucas@demo.com', password_hash: '$2a$10$dummy', created_at: new Date(Date.now() - 86400000 * 2) },
    ]
    mockDb.users.push(...mockUsers)
    console.log(`[Seed] Created ${mockUsers.length} demo users`)
  }

  const firstUser = mockDb.users[0]
  demoContent.forEach((item, i) => {
    const charId = charIds[i % charIds.length]
    const author = mockDb.users[i % mockDb.users.length]
    const daysAgo = Math.floor(Math.random() * 14)
    const createdDate = new Date()
    createdDate.setDate(createdDate.getDate() - daysAgo)
    createdDate.setHours(Math.floor(Math.random() * 24))

    mockDb.posts.push({
      id: mockDb.nextPostId++,
      author_id: author.id,
      author_name: author.username || 'Anonymous',
      character_id: charId,
      content: item.content,
      image_url: null,
      status: item.status,
      likes_count: Math.floor(Math.random() * 200),
      comments_count: Math.floor(Math.random() * 40),
      created_at: createdDate
    })
  })

  // Create some demo reports
  const reportReasons = ['Spam', 'Inappropriate content', 'Harassment', 'Impersonation', 'Copyright violation']
  const reportStatuses = ['pending', 'pending', 'resolved', 'dismissed']
  for (let i = 0; i < 5; i++) {
    const targetPost = mockDb.posts[i % mockDb.posts.length]
    if (!targetPost) continue
    const createdDate = new Date()
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 7))

    mockDb.reports.push({
      id: mockDb.nextReportId++,
      post_id: targetPost.id,
      reporter_id: '__reporter__',
      reason: reportReasons[i % reportReasons.length],
      status: reportStatuses[i % reportStatuses.length],
      created_at: createdDate,
      resolved_at: i >= 3 ? new Date() : null
    })
  }

  console.log(`[Seed] Seeded ${mockDb.posts.length} posts, ${mockDb.characterPosts.length} character posts, and ${mockDb.reports.length} reports`)
}

export async function query(text, params) {
  if (!pool) {
    return mockQuery(text, params)
  }
  try {
    return await pool.query(text, params)
  } catch (err) {
    console.warn('[DB Query] Error, falling back to mock:', err.message)
    return mockQuery(text, params)
  }
}

/**
 * Try to parse a WHERE value from either params (prepared statement) or inline SQL.
 * Handles: WHERE status = $1 (with params) or WHERE status = 'removed' (inline)
 */
function parseInlineWhereValue(lower, params) {
  // Try params first
  if (params && params.length > 0 && !lower.includes('like')) {
    const firstParam = params[0]
    if (typeof firstParam === 'string' && !firstParam.includes('%')) {
      return firstParam
    }
  }
  // Try extracting from inline SQL: WHERE ... = 'value'
  const match = lower.match(/=\s*'([^']+)'/)
  if (match) return match[1]
  return null
}

function mockQuery(text, params) {
  // Simple mock that handles common queries
  const lower = text.toLowerCase()
  const now = new Date()

  // Helper: normalize UUIDs for mock comparison
  function normalizeId(val) {
    if (!val) return val
    // Remove any wrapping quotes/braces for consistent comparison
    return String(val).replace(/[{} "'`]/g, '').toLowerCase()
  }

  // Helper: filter array based on CURRENT_DATE/INTERVAL
  function filterByDate(items, dateField) {
    if (lower.includes('current_date')) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (lower.includes('interval') && lower.includes("'7 days")) {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return items.filter(item => new Date(item[dateField]) >= weekAgo)
      }
      return items.filter(item => new Date(item[dateField]) >= today)
    }
    return items
  }

  // Aggregates: COUNT(*)
  if (lower.includes('count(*)') && !lower.includes('group by') && !lower.includes('distinct')) {
    let source = []
    let tableFound = false
    if (lower.includes('from users')) {
      source = filterByDate(mockDb.users, 'created_at')
      tableFound = true
    } else if (lower.includes('from subscriptions')) {
      let subs = filterByDate(mockDb.subscriptions, 'created_at')
      if (lower.includes('status') && lower.includes('active')) {
        subs = subs.filter(s => s.status === 'active')
      }
      source = subs
      tableFound = true
    } else if (lower.includes('from posts')) {
      let items = [...mockDb.posts]
      if (lower.includes('where status')) {
        // Try to extract status from SQL text or params
        const statusVal = parseInlineWhereValue(lower, params)
        if (statusVal) {
          items = items.filter(p => p.status === statusVal)
        }
      }
      source = items
      tableFound = true
    } else if (lower.includes('from reports')) {
      let items = [...mockDb.reports]
      if (lower.includes('where status')) {
        const statusVal = parseInlineWhereValue(lower, params)
        if (statusVal) {
          items = items.filter(r => r.status === statusVal)
        }
      }
      source = items
      tableFound = true
    } else if (lower.includes('from user_restrictions')) {
      source = [...mockDb.userRestrictions]
      tableFound = true
    } else if (lower.includes('from character_posts')) {
      source = [...mockDb.characterPosts]
      // Filter by character_id
      if (lower.includes('where character_id')) {
        const charId = params ? params[0] : null
        if (charId) source = source.filter(p => String(p.character_id) === String(charId))
      }
      // Filter by scheduled_at conditions
      if (lower.includes('scheduled_at')) {
        if (lower.includes('is not null') && lower.includes('> now()')) {
          source = source.filter(p => p.scheduled_at && new Date(p.scheduled_at) > new Date())
        } else if (lower.includes('is null') || lower.includes('<= now()')) {
          source = source.filter(p => !p.scheduled_at || new Date(p.scheduled_at) <= new Date())
        }
      }
      // Filter by date range
      if (lower.includes('current_date')) {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
        if (lower.includes("interval '7 days")) {
          const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
          source = source.filter(p => new Date(p.created_at) >= weekAgo)
        } else if (lower.includes("interval '30 days")) {
          const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30)
          source = source.filter(p => new Date(p.created_at) >= monthAgo)
        }
      }
      tableFound = true
    }
    if (!tableFound) {
      source = []
    }
    return { rows: [{ count: source.length }], rowCount: 1 }
  }

  // GROUP BY + LEFT JOIN complex queries (admin routes)
  if (lower.includes('left join')) {
    if (lower.includes('from users') && lower.includes('left join subscriptions')) {
      // Users list with subscription details
      const rows = mockDb.users.map(u => {
        const activeSubs = mockDb.subscriptions.filter(s => s.user_id === u.id && s.status === 'active')
        const subDetails = activeSubs.map(s => `${s.character_id}:${s.plan}`).join(', ')
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          created_at: u.created_at,
          active_subs: activeSubs.length,
          sub_details: subDetails || null
        }
      })
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const limit = params && params.length > 0 ? parseInt(params[0]) : rows.length
      const offset = params && params.length > 1 ? parseInt(params[1]) : 0
      return { rows: rows.slice(offset, offset + limit), rowCount: rows.length }
    }

    if (lower.includes('from subscriptions') && lower.includes('join users')) {
      // Subscriptions with user info
      const rows = mockDb.subscriptions.map(s => {
        const user = mockDb.users.find(u => u.id === s.user_id)
        return {
          ...s,
          username: user ? user.username : null,
          email: user ? user.email : null
        }
      })
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const limit = params && params.length > 0 ? parseInt(params[0]) : rows.length
      const offset = params && params.length > 1 ? parseInt(params[1]) : 0
      return { rows: rows.slice(offset, offset + limit), rowCount: rows.length }
    }

    if (lower.includes('from characters') && lower.includes('left join subscriptions')) {
      // Character subscription stats
      const characterIds = ['aria', 'yuna', 'alexandra', 'lucas', 'nova', 'mason', 'mochi']
      const charNames = { aria: 'Aria', yuna: 'Yuna', alexandra: 'Alexandra', lucas: 'Lucas', nova: 'Nova', mason: 'Mason', mochi: 'Mochi' }
      const rows = characterIds.map(id => {
        const activeSubs = mockDb.subscriptions.filter(s => s.character_id === id && s.status === 'active')
        const premiumSubs = activeSubs.filter(s => s.plan === 'premium')
        const standardSubs = activeSubs.filter(s => s.plan === 'standard')
        const revenue = activeSubs.reduce((sum, s) => sum + (s.plan === 'premium' ? 15.99 : 7.99), 0)
        return {
          id,
          name: charNames[id] || id,
          age: null,
          tagline: null,
          active_subs: activeSubs.length,
          premium_subs: premiumSubs.length,
          standard_subs: standardSubs.length,
          revenue
        }
      })
      rows.sort((a, b) => b.active_subs - a.active_subs)
      return { rows, rowCount: rows.length }
    }
  }

  // GROUP BY queries (COUNT + GROUP BY) — First instance
  if (lower.includes('group by')) {
    if (lower.includes('from character_posts')) {
      let charId = null
      if (lower.includes('where character_id')) {
        charId = params ? params[0] : null
      }
      let posts = [...mockDb.characterPosts]
      if (charId) posts = posts.filter(p => p.character_id === charId)
      if (lower.includes('current_date')) {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
        if (lower.includes("interval '7 days")) {
          const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
          posts = posts.filter(p => new Date(p.created_at) >= weekAgo)
        }
      }
      if (lower.includes('group by type')) {
        const grouped = {}
        posts.forEach(p => {
          if (!grouped[p.type]) grouped[p.type] = 0
          grouped[p.type]++
        })
        const rows = Object.entries(grouped).map(([type, count]) => ({ type, count }))
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('date(')) {
        const grouped = {}
        posts.forEach(p => {
          const d = new Date(p.created_at)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (!grouped[dateStr]) grouped[dateStr] = 0
          grouped[dateStr]++
        })
        const rows = Object.entries(grouped).map(([date, count]) => ({ date, count }))
        rows.sort((a, b) => a.date.localeCompare(b.date))
        return { rows, rowCount: rows.length }
      }
      return { rows: [], rowCount: 0 }
    }
    if (lower.includes('from subscriptions')) {
      let subs = mockDb.subscriptions.filter(s => s.status === 'active')
      if (lower.includes('group by plan')) {
        const grouped = {}
        subs.forEach(s => {
          if (!grouped[s.plan]) grouped[s.plan] = 0
          grouped[s.plan]++
        })
        const rows = Object.entries(grouped).map(([plan, count]) => ({ plan, count }))
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('group by character_id')) {
        const grouped = {}
        subs.forEach(s => {
          if (!grouped[s.character_id]) grouped[s.character_id] = 0
          grouped[s.character_id]++
        })
        const rows = Object.entries(grouped).map(([character_id, count]) => ({ character_id, count }))
        rows.sort((a, b) => b.count - a.count)
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('date_trunc')) {
        const grouped = {}
        subs.forEach(s => {
          const d = new Date(s.created_at)
          const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
          if (!grouped[month]) grouped[month] = { new_subs: 0, revenue: 0 }
          grouped[month].new_subs++
          grouped[month].revenue += s.plan === 'premium' ? 15.99 : 7.99
        })
        const rows = Object.entries(grouped).map(([month, data]) => ({
          month,
          new_subs: data.new_subs,
          revenue: data.revenue
        })).sort((a, b) => b.month.localeCompare(a.month))
        return { rows, rowCount: rows.length }
      }
    }
    if (lower.includes('from users') && lower.includes('date(')) {
      const grouped = {}
      mockDb.users.forEach(u => {
        const d = new Date(u.created_at)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!grouped[dateStr]) grouped[dateStr] = 0
        grouped[dateStr]++
      })
      const rows = Object.entries(grouped).map(([date, count]) => ({ date, count }))
      rows.sort((a, b) => a.date.localeCompare(b.date))
      return { rows, rowCount: rows.length }
    }
    return { rows: [], rowCount: 0 }
  }

  // SUM queries — First instance
  if (lower.includes('sum(case') || lower.includes('sum(')) {
    let total = 0
    if (lower.includes('from character_posts')) {
      const charId = params ? params[0] : null
      let posts = [...mockDb.characterPosts]
      if (charId) posts = posts.filter(p => p.character_id === charId)
      const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0)
      const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0)
      return { rows: [{ total_likes: totalLikes, total_comments: totalComments }], rowCount: 1 }
    }
    if (lower.includes('from subscriptions')) {
      const subs = mockDb.subscriptions.filter(s => s.status === 'active')
      subs.forEach(s => {
        if (s.plan === 'premium') total += 15.99
        else if (s.plan === 'standard') total += 7.99
      })
    }
    return { rows: [{ mrr: total, sum: total }], rowCount: 1 }
  }

  // COUNT(DISTINCT
  if (lower.includes('count(distinct')) {
    let count = 0
    if (lower.includes('from subscriptions')) {
      const subs = mockDb.subscriptions.filter(s => s.status === 'active')
      count = new Set(subs.map(s => s.user_id)).size
    }
    return { rows: [{ count }], rowCount: 1 }
  }

  // GROUP BY queries (COUNT + GROUP BY) — Second instance
  if (lower.includes('group by')) {
    if (lower.includes('from character_posts')) {
      let charId = null
      if (lower.includes('where character_id')) {
        charId = params ? params[0] : null
      }
      let posts = [...mockDb.characterPosts]
      if (charId) posts = posts.filter(p => p.character_id === charId)
      if (lower.includes('current_date')) {
        const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
        if (lower.includes("interval '7 days")) {
          const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
          posts = posts.filter(p => new Date(p.created_at) >= weekAgo)
        }
      }
      if (lower.includes('group by type')) {
        const grouped = {}
        posts.forEach(p => {
          if (!grouped[p.type]) grouped[p.type] = 0
          grouped[p.type]++
        })
        const rows = Object.entries(grouped).map(([type, count]) => ({ type, count }))
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('date(')) {
        const grouped = {}
        posts.forEach(p => {
          const d = new Date(p.created_at)
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (!grouped[dateStr]) grouped[dateStr] = 0
          grouped[dateStr]++
        })
        const rows = Object.entries(grouped).map(([date, count]) => ({ date, count }))
        rows.sort((a, b) => a.date.localeCompare(b.date))
        return { rows, rowCount: rows.length }
      }
      return { rows: [], rowCount: 0 }
    }
    if (lower.includes('from subscriptions')) {
      let subs = mockDb.subscriptions.filter(s => s.status === 'active')
      if (lower.includes('group by plan')) {
        const grouped = {}
        subs.forEach(s => {
          if (!grouped[s.plan]) grouped[s.plan] = 0
          grouped[s.plan]++
        })
        const rows = Object.entries(grouped).map(([plan, count]) => ({ plan, count }))
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('group by character_id')) {
        const grouped = {}
        subs.forEach(s => {
          if (!grouped[s.character_id]) grouped[s.character_id] = 0
          grouped[s.character_id]++
        })
        const rows = Object.entries(grouped).map(([character_id, count]) => ({ character_id, count }))
        rows.sort((a, b) => b.count - a.count)
        return { rows, rowCount: rows.length }
      }
      if (lower.includes('date_trunc')) {
        // Revenue by month
        const grouped = {}
        subs.forEach(s => {
          const d = new Date(s.created_at)
          const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
          if (!grouped[month]) grouped[month] = { new_subs: 0, revenue: 0 }
          grouped[month].new_subs++
          grouped[month].revenue += s.plan === 'premium' ? 15.99 : 7.99
        })
        const rows = Object.entries(grouped).map(([month, data]) => ({
          month,
          new_subs: data.new_subs,
          revenue: data.revenue
        })).sort((a, b) => b.month.localeCompare(a.month))
        return { rows, rowCount: rows.length }
      }
    }
    // GROUP BY on users by date
    if (lower.includes('from users') && lower.includes('date(')) {
      const grouped = {}
      mockDb.users.forEach(u => {
        const d = new Date(u.created_at)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!grouped[dateStr]) grouped[dateStr] = 0
        grouped[dateStr]++
      })
      const rows = Object.entries(grouped).map(([date, count]) => ({ date, count }))
      rows.sort((a, b) => a.date.localeCompare(b.date))
      return { rows, rowCount: rows.length }
    }
    return { rows: [], rowCount: 0 }
  }

  // SUM queries — Second instance
  if (lower.includes('sum(case') || lower.includes('sum(')) {
    let total = 0
    if (lower.includes('from character_posts')) {
      const charId = params ? params[0] : null
      let posts = [...mockDb.characterPosts]
      if (charId) posts = posts.filter(p => p.character_id === charId)
      const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0)
      const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0)
      return { rows: [{ total_likes: totalLikes, total_comments: totalComments }], rowCount: 1 }
    }
    if (lower.includes('from subscriptions')) {
      const subs = mockDb.subscriptions.filter(s => s.status === 'active')
      subs.forEach(s => {
        if (s.plan === 'premium') total += 15.99
        else if (s.plan === 'standard') total += 7.99
      })
    }
    return { rows: [{ mrr: total, sum: total }], rowCount: 1 }
  }

  // COUNT(DISTINCT
  if (lower.includes('count(distinct')) {
    let count = 0
    if (lower.includes('from subscriptions')) {
      const subs = mockDb.subscriptions.filter(s => s.status === 'active')
      count = new Set(subs.map(s => s.user_id)).size
    }
    return { rows: [{ count }], rowCount: 1 }
  }

  // UPDATE users SET ...
  if (lower.includes('update users set')) {
    const userId = params ? params[params.length - 1] : null
    const user = mockDb.users.find(u => normalizeId(u.id) === normalizeId(userId))
    if (user) {
      user.updated_at = new Date()
      // Simple set parsing for common fields
      if (lower.includes('password_hash')) {
        user.password_hash = params[0]
      }
      if (lower.includes('username')) {
        const idx = lower.indexOf('username = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 11).split(/[^0-9]/)[0])
          user.username = params[paramNum - 1]
        }
      }
      if (lower.includes('avatar_url')) {
        const idx = lower.indexOf('avatar_url = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 13).split(/[^0-9]/)[0])
          user.avatar_url = params[paramNum - 1]
        }
      }
      if (lower.includes('bio')) {
        const idx = lower.indexOf('bio = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 6).split(/[^0-9]/)[0])
          user.bio = params[paramNum - 1]
        }
      }
      if (lower.includes('deletion_requested_at')) {
        if (lower.includes('= now()') || lower.includes("= 'now()")) {
          user.deletion_requested_at = new Date()
        } else if (lower.includes('= null') || lower.includes('is null')) {
          user.deletion_requested_at = null
        }
      }
      if (lower.includes('preferred_language')) {
        const idx = lower.indexOf('preferred_language = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 21).split(/[^0-9]/)[0])
          user.preferred_language = params[paramNum - 1]
        }
      }
      if (lower.includes('email_notifications')) {
        const idx = lower.indexOf('email_notifications = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 22).split(/[^0-9]/)[0])
          user.email_notifications = params[paramNum - 1]
        }
      }
      if (lower.includes('push_enabled')) {
        const idx = lower.indexOf('push_enabled = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 15).split(/[^0-9]/)[0])
          user.push_enabled = params[paramNum - 1]
        }
      }
      if (lower.includes('privacy_show_online')) {
        const idx = lower.indexOf('privacy_show_online = $')
        if (idx >= 0) {
          const paramNum = parseInt(lower.substring(idx + 22).split(/[^0-9]/)[0])
          user.privacy_show_online = params[paramNum - 1]
        }
      }
    }
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  // DELETE FROM users / messages / conversations
  if (lower.includes('delete from users')) {
    const userId = params ? params[0] : null
    const idx = mockDb.users.findIndex(u => normalizeId(u.id) === normalizeId(userId))
    if (idx >= 0) mockDb.users.splice(idx, 1)
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 }
  }

  if (lower.includes('delete from messages') && lower.includes('conversation_id')) {
    const convId = params ? parseInt(params[0]) : null
    mockDb.messages = mockDb.messages.filter(m => m.conversation_id !== convId)
    return { rows: [], rowCount: 0 }
  }

  if (lower.includes('delete from conversations') && lower.includes('where user_id')) {
    const userId = params ? params[0] : null
    mockDb.conversations = mockDb.conversations.filter(c => normalizeId(c.user_id) !== normalizeId(userId))
    mockDb.messages = mockDb.messages.filter(m => {
      const conv = mockDb.conversations.find(c => c.id === m.conversation_id && normalizeId(c.user_id) === normalizeId(userId))
      return !conv
    })
    return { rows: [], rowCount: 0 }
  }

  if (lower.includes('delete from conversations') && lower.includes('where id')) {
    const id = params ? parseInt(params[0]) : null
    const idx = mockDb.conversations.findIndex(c => c.id === id)
    if (idx !== -1) {
      const conv = mockDb.conversations[idx]
      mockDb.messages = mockDb.messages.filter(m => m.conversation_id !== conv.id)
      mockDb.conversations.splice(idx, 1)
    }
    return { rows: [], rowCount: 1 }
  }

  if ((lower.includes('update') || lower.includes('set')) && lower.includes('subscriptions') && (lower.includes('status') || lower.includes('plan'))) {
    // SQL: UPDATE subscriptions SET status = 'cancelled', ... WHERE stripe_subscription_id = $1 AND user_id = $2
    // Or:  UPDATE subscriptions SET status = 'cancelled', ... WHERE id = $1::bigint AND user_id = $2
    // Params are the WHERE values: [whereVal1, whereVal2]
    // or just [whereVal1] if no user_id filter
    let sub = null
    if (params && params.length >= 1) {
      const whereVal = params[0]  // stripe_subscription_id OR numeric id
      const userId = params.length >= 2 ? params[1] : null
      if (userId) {
        sub = mockDb.subscriptions.find(s =>
          (s.stripe_subscription_id === whereVal || String(s.id) === String(whereVal)) &&
          s.user_id === userId
        )
      } else {
        sub = mockDb.subscriptions.find(s =>
          s.stripe_subscription_id === whereVal || String(s.id) === String(whereVal)
        )
      }
    }
    if (sub) {
      if (lower.includes('status')) {
        sub.status = 'cancelled'
      }
      if (lower.includes('plan')) {
        sub.plan = params[0] || sub.plan
      }
      sub.updated_at = new Date()
    }
    return { rows: sub ? [sub] : [], rowCount: sub ? 1 : 0 }
  }

  if (lower.includes('delete from subscriptions')) {
    const userId = params ? params[0] : null
    const charId = params && params.length > 1 ? params[1] : null
    if (userId) {
      mockDb.subscriptions = mockDb.subscriptions.filter(s => normalizeId(s.user_id) !== normalizeId(userId))
    } else if (params && params[0] !== undefined) {
      const subId = Number(params[0])
      mockDb.subscriptions = mockDb.subscriptions.filter(s => s.id !== subId)
    }
    return { rows: [], rowCount: 0 }
  }

  if (lower.includes('delete from user_profiles')) {
    const userId = params ? params[0] : null
    mockDb.userProfiles = mockDb.userProfiles.filter(p => normalizeId(p.user_id) !== normalizeId(userId))
    return { rows: [], rowCount: 0 }
  }

  if (lower.includes('insert into users')) {
    const id = crypto.randomUUID?.() || `mock-${Date.now()}`
    const user = {
      id, username: params[1], email: params[0], password_hash: params[2],
      avatar_url: null, bio: null, deleted: false, deletion_requested_at: null,
      preferred_language: 'en', email_notifications: true, push_enabled: true, privacy_show_online: true,
      created_at: new Date(), updated_at: new Date()
    }
    mockDb.users.push(user)
    return { rows: [user], rowCount: 1 }
  }

  // SELECT with LIKE on users
  if (lower.includes('select') && lower.includes('from users') && lower.includes('like')) {
    const pattern = params ? params[0] : ''
    const search = pattern.replace(/%/g, '').toLowerCase()
    const matched = mockDb.users.filter(u =>
      (u.username && u.username.toLowerCase().includes(search)) ||
      (u.email && u.email.toLowerCase().includes(search))
    ).slice(0, 10)
    return { rows: matched.map(u => ({ id: u.id, username: u.username, avatar_url: u.avatar_url, bio: u.bio })), rowCount: matched.length }
  }

  // MUST check WHERE id BEFORE WHERE email (SELECT id, email... has both)
  if (lower.includes('select') && lower.includes('from users') && lower.includes('where id')) {
    const id = params ? params[0] : null
    const user = mockDb.users.find(u => normalizeId(u.id) === normalizeId(id))
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  if (lower.includes('select') && lower.includes('from users') && lower.includes('where email')) {
    const email = params ? params[0] : null
    const user = mockDb.users.find(u => u.email === email)
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  if (lower.includes('insert into subscriptions')) {
    const sub = {
      id: mockDb.nextSubId++,
      user_id: params[0],
      character_id: params[1],
      plan: params[2] || 'standard',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
    mockDb.subscriptions.push(sub)
    return { rows: [sub], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from subscriptions')) {
    let subs = [...mockDb.subscriptions]
    if (lower.includes('user_id')) {
      subs = subs.filter(s => s.user_id === (params ? params[0] : null))
    }
    if (lower.includes('character_id')) {
      subs = subs.filter(s => s.character_id === (params && params.length > 1 ? params[1] : null))
    }
    return { rows: subs, rowCount: subs.length }
  }

  if (lower.includes('insert into conversations')) {
    const userId = params ? params[0] : null
    const charId = params ? params[1] : null
    let existing = mockDb.conversations.find(c => c.user_id === userId && c.character_id === charId)
    if (existing) {
      existing.updated_at = new Date()
      return { rows: [existing], rowCount: 1 }
    }
    const conv = {
      id: mockDb.nextConvId++,
      user_id: userId,
      character_id: charId,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
    mockDb.conversations.push(conv)
    return { rows: [conv], rowCount: 1 }
  }

  if (lower.includes('insert into messages')) {
    const msg = {
      id: mockDb.nextMsgId++,
      conversation_id: params[0],
      role: params[1],
      content: params[2],
      tokens_used: params[3] || 0,
      is_paid: params[4] === true || params[4] === 'true' || false,
      paid_price: parseInt(params[5]) || 0,
      is_locked: params[6] === true || params[6] === 'true' || false,
      read_at: null,
      created_at: new Date()
    }
    mockDb.messages.push(msg)
    return { rows: [msg], rowCount: 1 }
  }

  // Update message (read status, unlock)
  if (lower.includes('update messages')) {
    if (lower.includes('where id =')) {
      // Single message update (e.g., unlock where id = $1)
      const id = params ? parseInt(params[0]) : null
      const msg = mockDb.messages.find(m => m.id === id)
      if (msg) {
        if (lower.includes('read_at')) msg.read_at = new Date()
        if (lower.includes('is_locked')) msg.is_locked = false
      }
      return { rows: msg ? [msg] : [], rowCount: msg ? 1 : 0 }
    }
    if (lower.includes('conversation_id')) {
      // Bulk update by conversation (e.g., mark all read)
      const convId = params ? parseInt(params[0]) : null
      let count = 0
      mockDb.messages.forEach(msg => {
        if (msg.conversation_id === convId && msg.role === 'assistant' && !msg.read_at) {
          msg.read_at = new Date()
          count++
        }
      })
      return { rows: [{ count }], rowCount: count }
    }
  }

  if (lower.includes('select') && lower.includes('from messages')) {
    let msgs = [...mockDb.messages]
    // Check WHERE id = $1 (single message lookup — check the WHERE clause specifically)
    if (lower.includes('where id =') && params) {
      const id = parseInt(params[0])
      msgs = msgs.filter(m => m.id === id)
    } else if (lower.includes('where conversation_id')) {
      msgs = msgs.filter(m => m.conversation_id === (params ? Number(params[0]) : null))
    } else if (lower.includes('conversation_id')) {
      msgs = msgs.filter(m => m.conversation_id === (params ? Number(params[0]) : null))
    }
    msgs.sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    if (lower.includes('limit') && !lower.includes('where id')) {
      const limit = params && params.length > 1 ? Number(params[1]) : 30
      msgs = msgs.slice(-limit)
    }
    return { rows: msgs, rowCount: msgs.length }
  }

  if (lower.includes('select') && lower.includes('from conversations')) {
    let convs = [...mockDb.conversations]
    if (lower.includes('where id =') && params) {
      const id = parseInt(params[0])
      convs = convs.filter(c => c.id === id)
    } else if (lower.includes('where user_id')) {
      convs = convs.filter(c => c.user_id === (params ? params[0] : null))
    } else if (lower.includes('user_id') && !lower.includes('where id =')) {
      convs = convs.filter(c => c.user_id === (params ? params[0] : null))
    }
    if (lower.includes('character_id') && !lower.includes('where id =') && !lower.includes('where character_id')) {
      convs = convs.filter(c => c.character_id === (params && params.length > 1 ? params[1] : null))
    }
    if (lower.includes('where character_id')) {
      convs = convs.filter(c => c.character_id === (params && params.length > 1 ? params[1] : null))
    }
    // Handle ORDER BY
    if (lower.includes('order by')) {
      if (lower.includes('updated_at desc')) {
        convs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      }
    }
    return { rows: convs, rowCount: convs.length }
  }

  // paid_msg_unlocks
  if (lower.includes('insert into paid_msg_unlocks')) {
    const unlock = {
      id: mockDb.nextUnlockId++,
      message_id: params[0],
      user_id: params[1],
      amount_paid: parseInt(params[2]) || 0,
      unlocked_at: new Date()
    }
    mockDb.paidMsgUnlocks.push(unlock)
    return { rows: [unlock], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from paid_msg_unlocks')) {
    let unlocks = [...mockDb.paidMsgUnlocks]
    if (lower.includes('message_id')) {
      unlocks = unlocks.filter(u => u.message_id === (params ? parseInt(params[0]) : null))
    }
    if (lower.includes('user_id')) {
      unlocks = unlocks.filter(u => u.user_id === (params && params.length > 1 ? params[1] : null))
    }
    return { rows: unlocks, rowCount: unlocks.length }
  }

  if (lower.includes('insert into user_profiles')) {
    const profile = {
      id: mockDb.nextProfileId++,
      user_id: params[0],
      character_id: params[1],
      relationship: 'new',
      facts: '{}',
      summary: '',
      preferences: '{}',
      last_active: new Date()
    }
    mockDb.userProfiles.push(profile)
    return { rows: [profile], rowCount: 1 }
  }

  // ═══════════════════════════════════════════════════════════
  // Character Posts (content publishing)
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into character_posts')) {
    // INSERT INTO character_posts (character_id, type, ppv_price, content, image_urls, likes, comments, locked, scheduled_at, created_at)
    // VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, NOW())
    const post = {
      id: mockDb.nextCharacterPostId++,
      character_id: params ? params[0] : null,
      type: params ? params[1] : 'free',
      ppv_price: params ? parseFloat(params[2]) || 0 : 0,
      content: params ? params[3] : '',
      image_urls: params && params[4] ? params[4] : '[]',
      likes: 0,
      comments: 0,
      locked: params ? (params[5] === true || params[5] === 'true' || false) : false,
      scheduled_at: params && params[6] ? params[6] : null,
      created_at: new Date()
    }
    mockDb.characterPosts.push(post)
    return { rows: [{ ...post, image_urls: post.image_urls }], rowCount: 1 }
  }

  if (lower.includes('update character_posts') && lower.includes('set')) {
    // We need to extract the post ID from the WHERE clause
    // The WHERE is at the end: WHERE id = $N AND character_id = 'X'
    const postId = params ? params[params.length - 1] : null
    const post = mockDb.characterPosts.find(p => String(p.id) === String(postId))
    if (post) {
      // Determine which fields to update based on params used
      // The params are positionally: [type, content, image_urls, ppvPrice, locked, scheduledAt, postId]
      // But since we send different fields, let's just check what changed
      if (params && params.length >= 2) {
        // type
        if (params[0] && ['free', 'subscriber', 'ppv'].includes(params[0])) post.type = params[0]
        // content
        if (params[1]) post.content = params[1]
        // image_urls
        if (params[2]) post.image_urls = params[2]
        // ppv_price
        if (params[3] !== undefined && params[3] !== null) post.ppv_price = parseFloat(params[3])
        // locked
        if (params[4] !== undefined && params[4] !== null) {
          post.locked = params[4] === true || params[4] === 'true'
        }
        // scheduled_at
        if (params[5] !== undefined) post.scheduled_at = params[5] || null
      }
    }
    return { rows: post ? [{ ...post, image_urls: post.image_urls }] : [], rowCount: post ? 1 : 0 }
  }

  if (lower.includes('delete from character_posts')) {
    const postId = params ? params[0] : null
    const idx = mockDb.characterPosts.findIndex(p => String(p.id) === String(postId))
    if (idx !== -1) {
      const deleted = mockDb.characterPosts.splice(idx, 1)[0]
      return { rows: [{ ...deleted }], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  }

  // SELECT * FROM character_posts WHERE character_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
  if (lower.includes('select') && lower.includes('from character_posts')) {
    let posts = [...mockDb.characterPosts]

    if (lower.includes('where id = $1') && lower.includes('character_id = $2')) {
      // Single post lookup: WHERE id = $1 AND character_id = $2
      const id = params ? parseInt(params[0]) : null
      const charId = params && params.length > 1 ? params[1] : null
      if (id) posts = posts.filter(p => p.id === id)
      if (charId) posts = posts.filter(p => p.character_id === charId)
    } else if (lower.includes('where character_id')) {
      // List posts: WHERE character_id = $1 ...
      const charId = params ? params[0] : null
      if (charId) posts = posts.filter(p => p.character_id === charId)

      // Filter by type if specified
      if (lower.includes('type = $2') || (lower.includes('type') && lower.includes('$2'))) {
        const typeFilter = params && params.length > 1 ? params[1] : null
        if (typeFilter) posts = posts.filter(p => p.type === typeFilter)
      }

      // ORDER BY created_at DESC
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // LIMIT/OFFSET — params order varies
      if (lower.includes('limit') || lower.includes('offset')) {
        const lim = lower.includes('limit') ? parseInt(params[params.length - 2]) : posts.length
        const off = lower.includes('offset') ? parseInt(params[params.length - 1]) || 0 : 0
        posts = posts.slice(off, off + (lim > 0 ? lim : posts.length))
      }
    }

    // Parse image_urls for each post
    const rows = posts.map(p => ({
      ...p,
      image_urls: typeof p.image_urls === 'string' ? p.image_urls : JSON.stringify(p.image_urls || [])
    }))

    return { rows, rowCount: rows.length }
  }

  // COUNT(*) from character_posts
  if (lower.includes('count(*)') && lower.includes('from character_posts')) {
    let posts = [...mockDb.characterPosts]
    if (lower.includes('where character_id')) {
      const charId = params ? params[0] : null
      if (charId) posts = posts.filter(p => p.character_id === charId)
    }
    if (lower.includes('type = $2') && params && params.length > 1) {
      const typeFilter = params[1]
      if (typeFilter) posts = posts.filter(p => p.type === typeFilter)
    }
    return { rows: [{ count: posts.length }], rowCount: 1 }
  }

  // GROUP BY type on character_posts
  if (lower.includes('group by type') && lower.includes('from character_posts')) {
    const charId = params ? params[0] : null
    let posts = [...mockDb.characterPosts]
    if (charId) posts = posts.filter(p => p.character_id === charId)
    const grouped = {}
    posts.forEach(p => {
      if (!grouped[p.type]) grouped[p.type] = 0
      grouped[p.type]++
    })
    const rows = Object.entries(grouped).map(([type, count]) => ({ type, count }))
    return { rows, rowCount: rows.length }
  }

  // SUM(likes) and SUM(comments) on character_posts
  if ((lower.includes('sum(likes)') || lower.includes('sum(comments)')) && lower.includes('from character_posts')) {
    const charId = params ? params[0] : null
    let posts = [...mockDb.characterPosts]
    if (charId) posts = posts.filter(p => p.character_id === charId)
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0)
    return { rows: [{ total_likes: totalLikes, total_comments: totalComments }], rowCount: 1 }
  }

  // ═══════════════════════════════════════════════════════════
  // Posts (content moderation)
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into posts')) {
    const post = {
      id: mockDb.nextPostId++,
      author_id: params ? params[0] : null,
      author_name: params ? params[1] : null,
      character_id: params ? params[2] : null,
      content: params ? params[3] : '',
      image_url: params && params[4] ? params[4] : null,
      status: 'published',
      likes_count: Math.floor(Math.random() * 100),
      comments_count: Math.floor(Math.random() * 20),
      created_at: new Date()
    }
    mockDb.posts.push(post)
    return { rows: [post], rowCount: 1 }
  }

  if ((lower.includes('update') || lower.includes('set')) && lower.includes('from posts') && lower.includes('where id')) {
    const idParam = params ? params[1] : params ? params[0] : null
    const statusVal = params ? params[0] : null
    const post = mockDb.posts.find(p => String(p.id) === String(idParam))
    if (post) {
      if (statusVal) post.status = statusVal
      post.updated_at = new Date()
    }
    return { rows: post ? [post] : [], rowCount: post ? 1 : 0 }
  }

  if ((lower.includes('update') || lower.includes('set')) && lower.includes('posts') && lower.includes('status')) {
    // UPDATE posts SET status = $1 WHERE id = $2
    const statusVal = params ? params[0] : null
    const idParam = params && params.length > 1 ? params[1] : null
    const post = mockDb.posts.find(p => String(p.id) === String(idParam))
    if (post) {
      post.status = statusVal
      post.updated_at = new Date()
    }
    return { rows: post ? [post] : [], rowCount: post ? 1 : 0 }
  }

  if ((lower.includes('select') || lower.includes('from')) && lower.includes('from posts')) {
    let posts = [...mockDb.posts]
    // Filter by status if specified
    if (lower.includes('where status')) {
      const statusVal = params ? params[0] : null
      if (statusVal && !statusVal.includes('%')) {
        posts = posts.filter(p => p.status === statusVal)
      }
    }
    if (lower.includes('where character_id')) {
      const charVal = params ? params[0] : null
      if (charVal) posts = posts.filter(p => p.character_id === charVal)
    }
    // ORDER BY created_at DESC
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    // LIMIT/OFFSET — PostgreSQL convention: $1=limit, $2=offset
    if (lower.includes('limit') || lower.includes('offset')) {
      const lim = params && params.length > 0 ? parseInt(params[params.length - 2] || 20) : posts.length
      const off = params && params.length > 0 ? parseInt(params[params.length - 1] || 0) : 0
      posts = posts.slice(off, off + lim)
    }
    return { rows: posts, rowCount: posts.length }
  }

  // ═══════════════════════════════════════════════════════════
  // Reports
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into reports')) {
    const report = {
      id: mockDb.nextReportId++,
      post_id: params ? parseInt(params[0]) : null,
      reporter_id: params ? params[1] : null,
      reason: params ? params[2] : '',
      status: 'pending',
      created_at: new Date()
    }
    mockDb.reports.push(report)
    return { rows: [report], rowCount: 1 }
  }

  if ((lower.includes('update') || lower.includes('set')) && lower.includes('reports') && lower.includes('status')) {
    const statusVal = params ? params[0] : null
    const idParam = params && params.length > 1 ? params[1] : null
    const report = mockDb.reports.find(r => String(r.id) === String(idParam))
    if (report) {
      report.status = statusVal
      report.resolved_at = new Date()
    }
    return { rows: report ? [report] : [], rowCount: report ? 1 : 0 }
  }

  if (lower.includes('select') && lower.includes('from reports')) {
    let reports = [...mockDb.reports]
    if (lower.includes('where status')) {
      const statusVal = params ? params[0] : null
      if (statusVal && !statusVal.includes('%')) {
        reports = reports.filter(r => r.status === statusVal)
      }
    }
    // Sort newest first
    reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    // LIMIT/OFFSET — PostgreSQL convention: $1=limit, $2=offset
    if (lower.includes('limit') || lower.includes('offset')) {
      const lim = params && params.length > 0 ? parseInt(params[params.length - 2] || 20) : reports.length
      const off = params && params.length > 0 ? parseInt(params[params.length - 1] || 0) : 0
      reports = reports.slice(off, off + lim)
    }
    return { rows: reports, rowCount: reports.length }
  }

  // ═══════════════════════════════════════════════════════════
  // User Restrictions
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into user_restrictions')) {
    const restriction = {
      id: mockDb.nextRestrictionId++,
      user_id: params ? params[0] : null,
      type: params ? params[1] : 'mute',
      reason: params ? params[2] : '',
      duration_hours: params && params[3] ? parseInt(params[3]) : 24,
      created_by: params && params[4] || '__admin__',
      active: true,
      created_at: new Date()
    }
    mockDb.userRestrictions.push(restriction)
    return { rows: [restriction], rowCount: 1 }
  }

  if ((lower.includes('update') || lower.includes('set')) && lower.includes('user_restrictions') && lower.includes('active')) {
    // Deactivate all active restrictions for a user (used for unban/unmute)
    const activeVal = params ? params[0] : false
    const userId = params && params.length > 1 ? params[1] : null
    mockDb.userRestrictions.forEach(r => {
      if (r.user_id === userId && r.active) {
        r.active = !!activeVal
      }
    })
    return { rows: [], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from user_restrictions')) {
    let restrictions = [...mockDb.userRestrictions]
    if (lower.includes('where user_id')) {
      const userId = params ? params[0] : null
      if (userId) restrictions = restrictions.filter(r => r.user_id === userId)
    }
    if (lower.includes('where active')) {
      restrictions = restrictions.filter(r => r.active === true)
    }
    restrictions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return { rows: restrictions, rowCount: restrictions.length }
  }

  // ═══════════════════════════════════════════════════════════
  // Payment Orders
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into payment_orders')) {
    // Different call sites use different param counts:
    // Subscription: ($1, $2, $3, 'usd', $4, 'completed', $5) — params=[userId, charId, amount, plan, paymentMethod]
    // Deposit: ($1, $2, 'usd', 'deposit', 'completed', 'wallet') — params=[userId, amount]
    // Withdrawal: ($1, $2, 'usd', 'withdrawal', 'pending', $3) — params=[userId, amount, payoutMethod]
    const order = {
      id: mockDb.nextOrderId++,
      user_id: params ? params[0] : null,
      character_id: null,
      amount: params && params[1] ? parseFloat(params[1]) : 0,
      currency: 'usd',
      plan: null,
      type: 'subscription',
      status: 'completed',
      payment_method: 'dev_mode',
      stripe_session_id: null,
      stripe_invoice_id: null,
      metadata: '{}',
      created_at: new Date()
    }
    // Detect type from SQL text
    if (lower.includes('tipping') || lower.includes('tip')) order.type = 'tip'
    if (lower.includes('withdrawal') || lower.includes('withdraw')) order.type = 'withdrawal'
    if (lower.includes('deposit')) order.type = 'deposit'
    // Map params based on detected type
    if (order.type === 'subscription') {
      // VALUES ($1, $2, $3, 'usd', $4, 'completed', $5)
      order.character_id = params && params[1] ? params[1] : null
      order.amount = params && params[2] ? parseFloat(params[2]) : 0
      order.plan = params && params[3] ? params[3] : null
      order.payment_method = params && params[4] ? params[4] : 'dev_mode'
    } else if (order.type === 'deposit') {
      // VALUES ($1, $2, 'usd', 'deposit', 'completed', 'wallet')
      order.amount = params && params[1] ? parseFloat(params[1]) : 0
      order.payment_method = 'wallet'
    } else if (order.type === 'withdrawal') {
      // VALUES ($1, $2, 'usd', 'withdrawal', 'pending', $3)
      order.amount = params && params[1] ? parseFloat(params[1]) : 0
      order.payment_method = params && params[2] ? params[2] : 'manual'
      order.status = 'pending'
    }
    mockDb.payment_orders.push(order)
    return { rows: [order], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from payment_orders')) {
    let orders = [...mockDb.payment_orders]
    if (lower.includes('where user_id')) {
      const userId = params ? params[0] : null
      if (userId) orders = orders.filter(o => o.user_id === userId)
    }
    // Order by created_at DESC
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (lower.includes('limit')) {
      const lim = parseInt(params[params.length - 1]) || 50
      orders = orders.slice(0, lim)
    }
    return { rows: orders, rowCount: orders.length }
  }

  // ═══════════════════════════════════════════════════════════
  // Tips
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into tips')) {
    // Actual SQL: VALUES ($1, $2, $3, 'usd', $4, $5, $6)
    // params = [userId, charId, amount, message, paymentMethod, paymentStatus]
    const tip = {
      id: mockDb.nextTipId++,
      from_user_id: params ? params[0] : null,
      character_id: params && params[1] ? params[1] : null,
      amount: params && params[2] ? parseFloat(params[2]) : 0,
      currency: 'usd',
      message: params && params[3] ? params[3] : null,
      payment_method: params && params[4] ? params[4] : 'dev_mode',
      payment_status: params && params[5] ? params[5] : 'completed',
      created_at: new Date()
    }
    mockDb.tips.push(tip)
    return { rows: [tip], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from tips')) {
    let tips = [...mockDb.tips]
    if (lower.includes('where from_user_id')) {
      const userId = params ? params[0] : null
      if (userId) tips = tips.filter(t => t.from_user_id === userId)
    }
    if (lower.includes('where character_id')) {
      const charId = params && params.length > 1 ? params[1] : null
      if (charId) tips = tips.filter(t => t.character_id === charId)
    }
    if (lower.includes('payment_status') && lower.includes('completed')) {
      tips = tips.filter(t => t.payment_status === 'completed')
    }
    // ORDER BY created_at DESC
    tips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (lower.includes('limit')) {
      const lim = parseInt(params[params.length - 1]) || 50
      tips = tips.slice(0, lim)
    }
    return { rows: tips, rowCount: tips.length }
  }

  if (lower.includes('count(*)') && lower.includes('from tips')) {
    let tips = [...mockDb.tips]
    if (lower.includes('where character_id')) {
      const charId = params && params.length > 1 ? params[1] : null
      if (charId) tips = tips.filter(t => t.character_id === charId)
    }
    if (lower.includes('payment_status') && lower.includes('completed')) {
      tips = tips.filter(t => t.payment_status === 'completed')
    }
    // Handle SUM queries
    if (lower.includes('sum(amount)')) {
      const totalAmount = tips.reduce((sum, t) => sum + t.amount, 0)
      const maxAmount = tips.length > 0 ? Math.max(...tips.map(t => t.amount)) : 0
      // If FILTER (WHERE from_user_id)
      if (lower.includes('filter') && lower.includes('from_user_id')) {
        const userId = params ? params[0] : null
        const userTips = tips.filter(t => t.from_user_id === userId)
        const userTotal = userTips.reduce((sum, t) => sum + t.amount, 0)
        return {
          rows: [{
            total_tips: tips.length,
            total_amount: totalAmount,
            largest_tip: maxAmount,
            user_tip_count: userTips.length,
            user_total: userTotal
          }],
          rowCount: 1
        }
      }
      return {
        rows: [{ count: tips.length, sum: totalAmount }],
        rowCount: 1
      }
    }
    return { rows: [{ count: tips.length }], rowCount: 1 }
  }

  // ═══════════════════════════════════════════════════════════
  // Wallets
  // ═══════════════════════════════════════════════════════════

  if (lower.includes('insert into wallets')) {
    const wallet = {
      id: mockDb.wallets.length + 1,
      user_id: params ? params[0] : null,
      balance: params && params[1] !== undefined ? parseFloat(params[1]) : 0,
      currency: params && params[2] ? params[2] : 'usd',
      created_at: new Date(),
      updated_at: new Date()
    }
    mockDb.wallets.push(wallet)
    return { rows: [wallet], rowCount: 1 }
  }

  if (lower.includes('update') && lower.includes('wallets') && lower.includes('balance')) {
    const balance = params ? parseFloat(params[0]) : 0
    const id = params && params.length > 1 ? parseInt(params[1]) : params && params.length > 0 ? parseInt(params[params.length - 1]) : null
    const wallet = mockDb.wallets.find(w => w.id === id)
    if (wallet) {
      wallet.balance = balance
      wallet.updated_at = new Date()
    }
    return { rows: wallet ? [wallet] : [], rowCount: wallet ? 1 : 0 }
  }

  if (lower.includes('select') && lower.includes('from wallets')) {
    let wallets = [...mockDb.wallets]
    if (lower.includes('where user_id')) {
      const userId = params ? params[0] : null
      if (userId) wallets = wallets.filter(w => w.user_id === userId)
    }
    return { rows: wallets, rowCount: wallets.length }
  }

  // Default: return empty
  return { rows: [], rowCount: 0 }
}
