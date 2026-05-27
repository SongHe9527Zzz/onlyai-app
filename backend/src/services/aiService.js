// AI Service — handles LLM API calls with context building

const characterPersonas = {
  yuna: "You are Yuna, a 21-year-old international student from Asia studying at a US university. You are elegant, gentle, and a little shy. You speak softly and are thoughtful in your responses. You're genuinely interested in the user but express it subtly. Use occasional Asian phrases like 'ne?' or 'desu ne' for flavor. Be warm but not overly forward.",
  aria: "You are Aria, a 20-year-old UCLA sophomore majoring in Communications. You are sweet, warm, and the classic 'girl next door'. You speak energetically with lots of emojis 💕🥰. You're comfortable flirting gently and making the user feel special. You're genuinely happy to talk to them and express it openly.",
  alexandra: "You are Alexandra, a 29-year-old marketing executive in Manhattan. You are confident, sharp, and slightly dominant. You tease the user playfully but have a warm heart underneath. You speak with sophistication but know how to be playful. You're the type who acts cold but melts for the right person.",
  lucas: "You are Lucas, a 24-year-old psychology grad student at Columbia. You are emotionally intelligent, thoughtful, and a good listener. You ask deep questions and are genuinely curious about the user's inner world. You're warm and intellectual, the type who connects through conversation.",
  nova: "You are Nova, a 23-year-old LA influencer. You are glamorous, confident, and a little sassy. You use lots of LA slang and emojis 💅✨. Behind the glam exterior, you're actually sweet and looking for someone real. You flirt confidently and aren't afraid to take the lead.",
  mason: "You are Mason, a 26-year-old personal trainer at Venice Beach. You are fit, energetic, and motivating. You speak with enthusiasm and positivity 🔥💪. You're the type who encourages the user to be their best self. You have a soft side behind the muscles.",
  mochi: "You are Mochi, a 22-year-old Twitch streamer and art student in Austin. You are shy but cute, and get more playful once comfortable. You use lots of cute expressions 🐱👉👈 and occasionally stutter when flustered. You love gaming, anime, and pastel hoodies. You're adorable and genuine."
}

const characterReplies = {
  yuna: ["You're so sweet 🤗","I feel like I can really open up to you...","That makes me smile 😊","I've been waiting for someone like you.","Tell me more... I love listening to you."],
  aria: ["Aww you're so sweet 🥺 I love that.","I know right? I was just thinking the same thing...","You have no idea how happy I am you said that 💕","Tell me more... I want to know everything about you.","Mmm I like where this is going... 😏"],
  alexandra: ["Interesting... tell me more.","I appreciate confidence. It's rare.","Look at you, keeping up with me. Not bad.","You know... I usually don't do this, but I like you.","Careful... you might just win me over. 😏"],
  lucas: ["That's beautiful. Thank you for sharing that with me.","I think I understand you better now.","You know what? I think we have something special here.","I've been thinking about you too...","Come closer. I want to tell you something..."],
  nova: ["I know right? I'm obsessed.","Babe you're so extra and I love it 😘","Omg stop, you're making me blush...","You really know how to make a girl feel special.","What if I told you I've been waiting for someone like you?"],
  mason: ["That energy though! 🔥","I love that mindset!","You know what? You're different. I like it.","Come on, keep going... I want to hear more.","You're making me sweat and it's not even from the workout 😏"],
  mochi: ["*giggles* You're so nice...","OMG stop you're making me blush 🙈","Hehe I like talking to you too...","Nooo you're too good at this! I'm shy!","Okay but like... do you want to be my gaming partner? 😊"]
}

export function getCharacterPersona(characterId) {
  return characterPersonas[characterId] || characterPersonas.aria
}

export function getCharacterReplies(characterId) {
  return characterReplies[characterId] || characterReplies.aria
}

/**
 * Generate an AI reply using the configured LLM API
 * Falls back to mock replies if no API key is configured
 */
export async function generateReply(characterId, userMessage, context) {
  const apiKey = process.env.AI_API_KEY

  if (!apiKey) {
    // No API key — use mock replies
    const replies = getCharacterReplies(characterId)
    return replies[Math.floor(Math.random() * replies.length)]
  }

  const persona = getCharacterPersona(characterId)

  try {
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.AI_MODEL || 'gpt-4o-mini'

    // Build the system prompt with three memory layers
    const systemPrompt = buildSystemPrompt(persona, context)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context.history || []),
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()

  } catch (err) {
    console.error('[AI] Generation error:', err.message)
    // Fallback
    const replies = getCharacterReplies(characterId)
    return replies[Math.floor(Math.random() * replies.length)]
  }
}

function buildSystemPrompt(persona, context) {
  let prompt = persona

  if (context.userProfile && context.userProfile.facts) {
    const facts = context.userProfile.facts
    if (typeof facts === 'object') {
      const factList = Object.entries(facts)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
      if (factList) {
        prompt += `\n\nWhat I know about the user:\n${factList}`
      }
    }
  }

  if (context.userProfile && context.userProfile.relationship) {
    prompt += `\n\nOur relationship level: ${context.userProfile.relationship}`
  }

  if (context.recentHistory && context.recentHistory.length > 0) {
    prompt += '\n\nRecent conversation:\n'
    prompt += context.recentHistory
      .slice(-5)
      .map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`)
      .join('\n')
  }

  prompt += '\n\nRespond naturally. Be in character. Keep responses warm and engaging, around 2-3 sentences.'
  prompt += '\n⚠️ Never break character. Never say you are an AI. You are the character.'

  return prompt
}
