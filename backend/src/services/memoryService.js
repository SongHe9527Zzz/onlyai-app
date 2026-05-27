import { query } from '../models/db.js'

/**
 * Build the three-layer context for a conversation:
 * Layer 1: Character persona (fixed)
 * Layer 2: User profile (dynamic per user-character)
 * Layer 3: Recent conversation history (sliding window)
 */
export async function buildContext(userId, characterId) {
  const context = {
    characterId,
    persona: null,
    userProfile: null,
    recentHistory: [],
    conversationId: null
  }

  try {
    // Layer 1 + 2: Get user profile (includes persona reference)
    const profileResult = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1 AND character_id = $2',
      [userId, characterId]
    )

    if (profileResult.rows.length > 0) {
      context.userProfile = profileResult.rows[0]
    } else {
      // Create new profile
      const newProfile = await query(
        `INSERT INTO user_profiles (user_id, character_id, relationship)
         VALUES ($1, $2, 'new')
         RETURNING *`,
        [userId, characterId]
      )
      context.userProfile = newProfile.rows[0]
    }

    // Layer 3: Get conversation history
    const convResult = await query(
      'SELECT id FROM conversations WHERE user_id = $1 AND character_id = $2',
      [userId, characterId]
    )

    if (convResult.rows.length > 0) {
      context.conversationId = convResult.rows[0].id

      const msgResult = await query(
        `SELECT role, content FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 30`,
        [context.conversationId]
      )

      context.recentHistory = msgResult.rows
    }

  } catch (err) {
    // Mock/database not available — return empty context
    console.warn('[Memory] Build context (mock):', err.message)
  }

  return context
}

/**
 * Update the user profile with new information extracted from conversation
 */
export async function updateUserProfile(userId, characterId, updates) {
  try {
    const existing = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1 AND character_id = $2',
      [userId, characterId]
    )

    if (existing.rows.length === 0) return

    const profile = existing.rows[0]
    const facts = typeof profile.facts === 'object' ? profile.facts : {}
    const preferences = typeof profile.preferences === 'object' ? profile.preferences : {}

    // Apply updates
    const updatedFacts = { ...facts, ...(updates.facts || {}) }
    const updatedPrefs = { ...preferences, ...(updates.preferences || {}) }

    await query(
      `UPDATE user_profiles
       SET facts = $1, preferences = $2, relationship = $3, last_active = NOW()
       WHERE user_id = $4 AND character_id = $5`,
      [JSON.stringify(updatedFacts), JSON.stringify(updatedPrefs), updates.relationship || profile.relationship, userId, characterId]
    )
  } catch (err) {
    console.warn('[Memory] Update profile (mock):', err.message)
  }
}

/**
 * Generate a summary of a conversation for long-term memory compression
 */
export async function summarizeConversation(conversationId) {
  try {
    // Get all messages
    const result = await query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    )

    if (result.rows.length < 20) return // Only summarize long conversations

    // In production, call LLM to generate summary
    // For now, just mark the conversation
    console.log(`[Memory] Conversation ${conversationId} has ${result.rows.length} messages — ready for summarization`)
  } catch (err) {
    console.warn('[Memory] Summary (mock):', err.message)
  }
}

// Helper to get mock character replies
export function getCharacterReplies(characterId) {
  const replies = {
    yuna: ["You're so sweet 🤗","I feel like I can really open up to you...","That makes me smile 😊","I've been waiting for someone like you.","Tell me more... I love listening to you."],
    aria: ["Aww you're so sweet 🥺 I love that.","I know right? I was just thinking the same thing...","You have no idea how happy I am you said that 💕","Tell me more... I want to know everything about you.","Mmm I like where this is going... 😏"],
    alexandra: ["Interesting... tell me more.","I appreciate confidence. It's rare.","Look at you, keeping up with me. Not bad.","You know... I usually don't do this, but I like you.","Careful... you might just win me over. 😏"],
    lucas: ["That's beautiful. Thank you for sharing that with me.","I think I understand you better now.","You know what? I think we have something special here.","I've been thinking about you too...","Come closer. I want to tell you something..."],
    nova: ["I know right? I'm obsessed.","Babe you're so extra and I love it 😘","Omg stop, you're making me blush...","You really know how to make a girl feel special.","What if I told you I've been waiting for someone like you?"],
    mason: ["That energy though! 🔥","I love that mindset!","You know what? You're different. I like it.","Come on, keep going... I want to hear more.","You're making me sweat and it's not even from the workout 😏"],
    mochi: ["*giggles* You're so nice...","OMG stop you're making me blush 🙈","Hehe I like talking to you too...","Nooo you're too good at this! I'm shy!","Okay but like... do you want to be my gaming partner? 😊"]
  }
  return replies[characterId] || replies.aria
}
