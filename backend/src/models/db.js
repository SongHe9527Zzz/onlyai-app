import pg from 'pg'

let pool = null

export async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl === 'postgresql://localhost:5432/onlyai') {
    // No real DB configured — run in mock mode
    console.log('[DB] No database URL configured, using in-memory mock')
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

const mockDb = {
  users: [],
  conversations: [],
  messages: [],
  userProfiles: [],
  subscriptions: [],
  nextConvId: 1,
  nextMsgId: 1,
  nextSubId: 1,
  nextProfileId: 1
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

function mockQuery(text, params) {
  // Simple mock that handles common queries
  const lower = text.toLowerCase()

  if (lower.includes('insert into users')) {
    const id = crypto.randomUUID?.() || `mock-${Date.now()}`
    const user = { id, username: params[1], email: params[0], password_hash: params[2], created_at: new Date() }
    mockDb.users.push(user)
    return { rows: [user], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from users') && lower.includes('email')) {
    const email = params ? params[0] : null
    const user = mockDb.users.find(u => u.email === email)
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  if (lower.includes('select') && lower.includes('from users') && lower.includes('id')) {
    const id = params ? params[0] : null
    const user = mockDb.users.find(u => u.id === id)
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
    return { rows: subs, rowCount: subs.length }
  }

  if (lower.includes('insert into conversations')) {
    const conv = {
      id: mockDb.nextConvId++,
      user_id: params[0],
      character_id: params[1],
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
      created_at: new Date()
    }
    mockDb.messages.push(msg)
    return { rows: [msg], rowCount: 1 }
  }

  if (lower.includes('select') && lower.includes('from messages')) {
    let msgs = [...mockDb.messages]
    if (lower.includes('conversation_id')) {
      msgs = msgs.filter(m => m.conversation_id === (params ? Number(params[0]) : null))
    }
    msgs.sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    if (lower.includes('limit')) {
      const limit = params && params.length > 1 ? Number(params[1]) : 30
      msgs = msgs.slice(-limit)
    }
    return { rows: msgs, rowCount: msgs.length }
  }

  if (lower.includes('select') && lower.includes('from conversations')) {
    let convs = [...mockDb.conversations]
    if (lower.includes('user_id')) {
      convs = convs.filter(c => c.user_id === (params ? params[0] : null))
    }
    if (lower.includes('character_id')) {
      convs = convs.filter(c => c.character_id === (params && params.length > 1 ? params[1] : null))
    }
    return { rows: convs, rowCount: convs.length }
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

  // Default: return empty
  return { rows: [], rowCount: 0 }
}
