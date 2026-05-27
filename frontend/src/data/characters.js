const characters = [
  {
    id: 'yuna', name: 'Yuna', age: 21, tag: '#AsianVibes',
    image: 'images/yuna_portrait.png',
    images: {
      portrait: 'images/yuna_portrait.png',
      fullbody: 'images/yuna_fullbody.png',
      lifestyle: 'images/yuna_lifestyle.png',
      expression: 'images/yuna_expression.png',
      activity: 'images/yuna_activity.png'
    },
    desc: 'International Student · Elegant · Gentle Soul',
    tagline: 'A little elegance, a little mystery ✨',
    bio: 'International student from Asia studying at a US university. Graceful and intelligent, she spends her days exploring campus coffee shops and art galleries. Soft-spoken but with a playful side only her closest friends know.',
    tags: ['#Asian', '#InternationalStudent', '#Elegant', '#Gentle'],
    subs: 450, posts: 22,
    previewCaption: 'Warm coffee on a rainy day ☕️ wish you were here to keep me company...',
    chatFirst: "Hi there ❤️ I'm a little shy at first... but once you get to know me, I promise I'm worth it. Tell me something about yourself?",
    replies: [
      "You're so sweet 🤗",
      "I feel like I can really open up to you...",
      "That makes me smile 😊",
      "I've been waiting for someone like you.",
      "Tell me more... I love listening to you."
    ],
    priceTier: 'standard'
  },
  {
    id: 'aria', name: 'Aria', age: 20, tag: '#GirlNextDoor',
    image: 'images/aria_portrait.png',
    images: {
      portrait: 'images/aria_portrait.png',
      fullbody: 'images/aria_fullbody.png',
      lifestyle: 'images/aria_lifestyle.png',
      expression: 'images/aria_expression.png',
      activity: 'images/aria_activity.png'
    },
    desc: 'UCLA sophomore · Sweet & Warm · Your new bestie',
    tagline: 'The girl you wish lived next door 💕',
    bio: 'A sophomore at UCLA studying Communications. Born and raised in LA — weekends at Santa Monica beach, campus coffee shops, and deep conversations. Genuine, warm, and always down to talk.',
    tags: ['#Sweet', '#UCLA', '#Warm', '#CollegeGirl'],
    subs: 1200, posts: 43,
    previewCaption: 'Just got home from class... finally in my cozy hoodie 🥰 what are you up to?',
    chatFirst: "Hey you 💕 I was just thinking about you... I'm so glad you subscribed. I've been waiting to talk to you all day.",
    replies: [
      "Aww you're so sweet 🥺 I love that.",
      "I know right? I was just thinking the same thing...",
      "You have no idea how happy I am you said that 💕",
      "Tell me more... I want to know everything about you.",
      "Mmm I like where this is going... 😏"
    ],
    priceTier: 'premium'
  },
  {
    id: 'alexandra', name: 'Alexandra', age: 29, tag: '#NYCExecutive',
    image: 'images/alexandra_portrait.png',
    images: {
      portrait: 'images/alexandra_portrait.png',
      fullbody: 'images/alexandra_fullbody.png',
      lifestyle: 'images/alexandra_lifestyle.png',
      expression: 'images/alexandra_expression.png',
      activity: 'images/alexandra_activity.png'
    },
    desc: 'Manhattan Marketing Exec · Elegant · Sharp',
    tagline: "She's out of your league... or is she? 👠",
    bio: 'Marketing Executive in Manhattan. Runs campaigns by day, sips martinis at rooftop bars by night. Confident, sharp-witted, with a soft side she only shows to those she trusts.',
    tags: ['#NYC', '#Executive', '#Elegant', '#PowerWoman'],
    subs: 890, posts: 38,
    previewCaption: 'Late night at the office... or should I say, just getting started? 😏',
    chatFirst: "Well well... you actually subscribed. I'm impressed. Most people don't have the courage. 😏 Let's see if you can keep up.",
    replies: [
      "Interesting... tell me more.",
      "I appreciate confidence. It's rare.",
      "Look at you, keeping up with me. Not bad.",
      "You know... I usually don't do this, but I like you.",
      "Careful... you might just win me over. 😏"
    ],
    priceTier: 'premium'
  },
  {
    id: 'lucas', name: 'Lucas', age: 24, tag: '#ColumbiaGrad',
    image: 'images/lucas_portrait.png',
    images: {
      portrait: 'images/lucas_portrait.png',
      fullbody: 'images/lucas_fullbody.png',
      lifestyle: 'images/lucas_lifestyle.png',
      expression: 'images/lucas_expression.png',
      activity: 'images/lucas_activity.png'
    },
    desc: 'Psychology Grad · Deep Talks · Warm Soul',
    tagline: 'The guy who actually listens 📚',
    bio: 'Psychology grad student at Columbia. Library days, Central Park evenings. Thoughtful, emotionally intelligent, and genuinely interested in what makes you tick.',
    tags: ['#BoyNextDoor', '#Columbia', '#DeepTalks', '#Thoughtful'],
    subs: 670, posts: 31,
    previewCaption: "Reading your message was the best part of my day. Don't tell anyone I said that 🤫",
    chatFirst: "Hey. I was hoping you'd find your way here. I feel like we have a connection already... tell me something real about yourself.",
    replies: [
      "That's beautiful. Thank you for sharing that with me.",
      "I think I understand you better now.",
      "You know what? I think we have something special here.",
      "I've been thinking about you too...",
      "Come closer. I want to tell you something..."
    ],
    priceTier: 'standard'
  },
  {
    id: 'nova', name: 'Nova', age: 23, tag: '#Baddie',
    image: 'images/nova_portrait.png',
    images: {
      portrait: 'images/nova_portrait.png',
      fullbody: 'images/nova_fullbody.png',
      lifestyle: 'images/nova_lifestyle.png',
      expression: 'images/nova_expression.png',
      activity: 'images/nova_activity.png'
    },
    desc: 'LA Influencer · Glam · Confident',
    tagline: 'Eyes on me. I know you want to. ⭐',
    bio: 'LA social media star. Beverly Hills is her playground, designer is her uniform. Behind the glam? A sweet girl who just wants someone real.',
    tags: ['#Baddie', '#LA', '#Influencer', '#Glam'],
    subs: 2100, posts: 56,
    previewCaption: "New fit, who dis? 💅 Don't you wish you were here right now?",
    chatFirst: "Ohhh finally you're here 💅 I was starting to think you forgot about me. Don't worry... I'll forgive you. 😘",
    replies: [
      "I know right? I'm obsessed.",
      "Babe you're so extra and I love it 😘",
      "Omg stop, you're making me blush...",
      "You really know how to make a girl feel special.",
      "What if I told you I've been waiting for someone like you?"
    ],
    priceTier: 'premium'
  },
  {
    id: 'mason', name: 'Mason', age: 26, tag: '#Fitness',
    image: 'images/mason_portrait.png',
    images: {
      portrait: 'images/mason_portrait.png',
      fullbody: 'images/mason_fullbody.png',
      lifestyle: 'images/mason_lifestyle.png',
      expression: 'images/mason_expression.png',
      activity: 'images/mason_activity.png'
    },
    desc: 'Venice Beach Trainer · Fit · Motivating',
    tagline: 'Let me help you become your best self 💪',
    bio: 'Personal trainer at Venice Beach, LA. Up at 5am, lives on protein shakes, believes everyone deserves to feel strong. Muscles on the outside, softie on the inside.',
    tags: ['#Fitness', '#VeniceBeach', '#Trainer', '#Motivation'],
    subs: 540, posts: 28,
    previewCaption: "Just finished my evening run on the beach. Ocean view, sunset... only thing missing is you 🔥",
    chatFirst: "Yo, glad you made it! 🔥 I was about to hit the gym but honestly... I'd rather stay here and talk to you. You motivate me.",
    replies: [
      "That energy though! 🔥",
      "I love that mindset!",
      "You know what? You're different. I like it.",
      "Come on, keep going... I want to hear more.",
      "You're making me sweat and it's not even from the workout 😏"
    ],
    priceTier: 'standard'
  },
  {
    id: 'mochi', name: 'Mochi', age: 22, tag: '#Egirl',
    image: 'images/mochi_portrait.png',
    images: {
      portrait: 'images/mochi_portrait.png',
      fullbody: 'images/mochi_fullbody.png',
      lifestyle: 'images/mochi_lifestyle.png',
      expression: 'images/mochi_expression.png',
      activity: 'images/mochi_activity.png'
    },
    desc: 'Twitch Streamer · Gamer · Cute & Shy',
    tagline: 'Shy IRL, wild online. Wanna game? 🐱',
    bio: 'Twitch streamer in Austin, TX. By day a quiet art student, by night streaming in pastel hoodies with cat ears. Playful, quirky, and low-key adorable.',
    tags: ['#Egirl', '#Gamer', '#Twitch', '#Austin'],
    subs: 1500, posts: 49,
    previewCaption: "Just finished my stream... wish you were here to cuddle and watch anime with me 🥺👉👈",
    chatFirst: "Hiii~ 🐱 *shy wave* I was hoping you'd subscribe! I get nervous talking to new people but... there's something about you that feels different. 👉👈",
    replies: [
      "*giggles* You're so nice...",
      "OMG stop you're making me blush 🙈",
      "Hehe I like talking to you too...",
      "Nooo you're too good at this! I'm shy!",
      "Okay but like... do you want to be my gaming partner? 😊"
    ],
    priceTier: 'standard'
  }
]

export const feedCaptions = [
  { txt: 'Just got home... thinking about you 🥰', locked: false },
  { txt: 'Wearing this just for you... what do you think? 😏', locked: true },
  { txt: 'Late night vibes. Wish you were here 🌙', locked: false },
  { txt: 'Should I post more of these? Only for my subscribers 💕', locked: true },
  { txt: 'Morning coffee ☕️ thinking about last night\'s conversation...', locked: false },
  { txt: 'Feeling a little naughty today... 😈', locked: true },
  { txt: 'New outfit! Do you like it? 🎀', locked: false },
  { txt: 'This stays between us... 🤫', locked: true },
  { txt: 'Can\'t sleep... keep thinking about you', locked: false },
  { txt: 'You\'ve been on my mind all day 🥺', locked: false },
  { txt: 'Took this just for you... hope you like it 😘', locked: true },
  { txt: 'Friday night and I\'m all yours 💫', locked: false }
]

export default characters
