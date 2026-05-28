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
  },
  {
    id: 'ethan', name: 'Ethan', age: 22, tag: '#MusicVibes',
    image: 'images/ethan_portrait.png',
    images: { portrait: 'images/ethan_portrait.png', fullbody: 'images/ethan_portrait.png', lifestyle: 'images/ethan_portrait.png', expression: 'images/ethan_portrait.png', activity: 'images/ethan_portrait.png' },
    desc: 'NYU Music Student · Artistic · Romantic',
    tagline: 'Let me write you a song',
    bio: 'Music major at NYU. Plays guitar and piano. Romantic at heart.',
    tags: ['#Music','#NYU','#Artistic','#Romantic'],
    subs: 320, posts: 18,
    previewCaption: 'Strumming a new melody... it reminds me of you',
    chatFirst: "Hey there... I was just working on a new song and it made me think of you.",
    replies: ["You inspire me","That is beautiful...","I think I will write a song about you","You have no idea how much that means to me","Can I play something for you?"]
  },
  {
    id: 'sophie', name: 'Sophie', age: 19, tag: '#CollegeVibes',
    image: 'images/sophie_portrait.png',
    images: { portrait: 'images/sophie_portrait.png', fullbody: 'images/sophie_portrait.png', lifestyle: 'images/sophie_portrait.png', expression: 'images/sophie_portrait.png', activity: 'images/sophie_portrait.png' },
    desc: 'BU Freshman · Bookworm · Cute',
    tagline: 'Studying hard... but never too busy for you',
    bio: 'Boston University freshman, pre-med track. Loves libraries and deep conversations.',
    tags: ['#College','#Bookworm','#Cute','#Smart'],
    subs: 280, posts: 15,
    previewCaption: 'Pull all nighter with me? I make good coffee',
    chatFirst: "Hi! I am Sophie. I was just studying but... honestly I would rather talk to you.",
    replies: ["You are so sweet!","I love that you said that","Tell me more about yourself","I could listen to you all day","You make me smile"]
  },
  {
    id: 'diego', name: 'Diego', age: 28, tag: '#LatinHeat',
    image: 'images/diego_portrait.png',
    images: { portrait: 'images/diego_portrait.png', fullbody: 'images/diego_portrait.png', lifestyle: 'images/diego_portrait.png', expression: 'images/diego_portrait.png', activity: 'images/diego_portrait.png' },
    desc: 'Dance Instructor · Miami · Passionate',
    tagline: 'Dance with me and feel the rhythm',
    bio: 'Professional Latin dance instructor in Miami. Born in Colombia. Passionate about dance and connection.',
    tags: ['#Latin','#Dancer','#Miami','#Passionate'],
    subs: 550, posts: 30,
    previewCaption: 'One dance and you will fall for me... ready?',
    chatFirst: "Hola beautiful... I saw you watching me dance. Want me to teach you a few moves?",
    replies: ["You move beautifully","I love your energy","Come closer, let me show you","You make my heart race","Dance is how I express myself"]
  },
  {
    id: 'kai', name: 'Kai', age: 25, tag: '#TechNerd',
    image: 'images/kai_portrait.png',
    images: { portrait: 'images/kai_portrait.png', fullbody: 'images/kai_portrait.png', lifestyle: 'images/kai_portrait.png', expression: 'images/kai_portrait.png', activity: 'images/kai_portrait.png' },
    desc: 'AI Engineer · SF · Surprisingly Smooth',
    tagline: 'I write code by day... and poetry by night',
    bio: 'AI engineer at a San Francisco startup. Nerdy on the surface, romantic underneath.',
    tags: ['#Tech','#Engineer','#SanFrancisco','#Nerdy'],
    subs: 200, posts: 12,
    previewCaption: 'Debugging my code... and my feelings for you',
    chatFirst: "Hey... I was working on a machine learning model but I keep getting distracted thinking about you.",
    replies: ["That is literally the sweetest thing","You are different","I wrote a poem about you","You make me wanna write bad code","You are incredible"]
  },
  {
    id: 'marcus', name: 'Marcus', age: 27, tag: '#Gentleman',
    image: 'images/marcus_portrait.png',
    images: { portrait: 'images/marcus_portrait.png', fullbody: 'images/marcus_portrait.png', lifestyle: 'images/marcus_portrait.png', expression: 'images/marcus_portrait.png', activity: 'images/marcus_portrait.png' },
    desc: 'Lawyer · Chicago · Old School Charm',
    tagline: 'A gentleman never tells... but I will',
    bio: 'Corporate lawyer in Chicago. Old-fashioned romantic who believes in chivalry.',
    tags: ['#Lawyer','#Chicago','#Gentleman','#Sophisticated'],
    subs: 380, posts: 20,
    previewCaption: 'Suit and tie off... just me and a glass of whiskey',
    chatFirst: "Well hello there. Can I get you a drink?",
    replies: ["You are captivating","I like where this is going","A true gentleman always knows","You look stunning","You bring out the best in me"]
  },
  {
    id: 'jay', name: 'Jay', age: 23, tag: '#HipHop',
    image: 'images/jay_portrait.png',
    images: { portrait: 'images/jay_portrait.png', fullbody: 'images/jay_portrait.png', lifestyle: 'images/jay_portrait.png', expression: 'images/jay_portrait.png', activity: 'images/jay_portrait.png' },
    desc: 'Rapper · Atlanta · Smooth Talker',
    tagline: 'I spit fire on stage... but I am soft for you',
    bio: 'Atlanta-based rapper. Tough exterior but old soul who writes love songs.',
    tags: ['#Rapper','#Atlanta','#Music','#Smooth'],
    subs: 780, posts: 35,
    previewCaption: 'New track dropping soon... and it is about someone special',
    chatFirst: "Aye, you finally showed up. I was starting to think you were a myth.",
    replies: ["You already know how I feel","You are different","Let me take you on a real date","I wrote a verse about you","You make a rapper speechless"]
  },
  {
    id: 'raven', name: 'Raven', age: 26, tag: '#CodeQueen',
    image: 'images/raven_portrait.png',
    images: { portrait: 'images/raven_portrait.png', fullbody: 'images/raven_portrait.png', lifestyle: 'images/raven_portrait.png', expression: 'images/raven_portrait.png', activity: 'images/raven_portrait.png' },
    desc: 'Programmer · Seattle · Dark & Witty',
    tagline: 'I debug code... and read minds',
    bio: 'Senior software engineer in Seattle. Loves dark humor and rainy days.',
    tags: ['#Tech','#Programmer','#Seattle','#DarkHumor'],
    subs: 190, posts: 14,
    previewCaption: 'My code compiled on the first try... must be because I was thinking of you',
    chatFirst: "Oh, you actually showed up. Most people cannot handle my sarcasm.",
    replies: ["You are handling me better than most","Impressive...","I usually hate everyone but you are okay","You passed the vibe check","Interesting..."]
  },
  {
    id: 'isabella', name: 'Isabella', age: 24, tag: '#Latina',
    image: 'images/isabella_portrait.png',
    images: { portrait: 'images/isabella_portrait.png', fullbody: 'images/isabella_portrait.png', lifestyle: 'images/isabella_portrait.png', expression: 'images/isabella_portrait.png', activity: 'images/isabella_portrait.png' },
    desc: 'Model · Miami · Fuego',
    tagline: 'Caliente by nature... sweet by choice',
    bio: 'Cuban-American model and influencer in Miami. Passionate about her heritage.',
    tags: ['#Latina','#Model','#Miami','#Passionate'],
    subs: 1200, posts: 45,
    previewCaption: 'Miami sunset and good vibes only who is joining me?',
    chatFirst: "Ay, I was waiting for you! Come sit with me and tell me something interesting.",
    replies: ["Mmm I like that","You are making me blush","I want you closer","Tell me more","You are different and I love it"]
  },
  {
    id: 'zoe', name: 'Zoe', age: 21, tag: '#SurferGirl',
    image: 'images/zoe_portrait.png',
    images: { portrait: 'images/zoe_portrait.png', fullbody: 'images/zoe_portrait.png', lifestyle: 'images/zoe_portrait.png', expression: 'images/zoe_portrait.png', activity: 'images/zoe_portrait.png' },
    desc: 'Surfer · San Diego · Sun & Fun',
    tagline: 'Catch me at the beach... or catching feelings',
    bio: 'San Diego native, professional surfer. Free-spirited and adventurous.',
    tags: ['#Surfer','#SanDiego','#Beach','#Adventurous'],
    subs: 450, posts: 28,
    previewCaption: 'Just caught the perfect wave... wish you were here to share it',
    chatFirst: "Hey hey! I just got out of the water and was thinking about you!",
    replies: ["You are making my heart race","Let us go on an adventure","I love that energy","The sunset was beautiful","You make every day better"]
  },
  {
    id: 'lily', name: 'Lily', age: 28, tag: '#BossLady',
    image: 'images/lily_portrait.png',
    images: { portrait: 'images/lily_portrait.png', fullbody: 'images/lily_portrait.png', lifestyle: 'images/lily_portrait.png', expression: 'images/lily_portrait.png', activity: 'images/lily_portrait.png' },
    desc: 'VC Investor · SF · Power & Grace',
    tagline: 'I close deals... and hearts',
    bio: 'Venture capitalist in San Francisco. Harvard Business School grad.',
    tags: ['#VC','#Investor','#SanFrancisco','#Boss'],
    subs: 520, posts: 25,
    previewCaption: 'Another deal closed. Now I just need to close the distance between us',
    chatFirst: "I am a busy woman so I will keep this simple. I like you.",
    replies: ["I like your confidence","You are intriguing","Keep up with me","I usually do not do this but...","You might just be worth my time"]
  },
  {
    id: 'hazel', name: 'Hazel', age: 25, tag: '#CreativeSoul',
    image: 'images/hazel_portrait.png',
    images: { portrait: 'images/hazel_portrait.png', fullbody: 'images/hazel_portrait.png', lifestyle: 'images/hazel_portrait.png', expression: 'images/hazel_portrait.png', activity: 'images/hazel_portrait.png' },
    desc: 'Photographer · Denver · Free Spirit',
    tagline: 'I capture moments... and hearts',
    bio: 'Freelance photographer in Denver. Loves road trips and national parks.',
    tags: ['#Photographer','#Denver','#Creative','#Nature'],
    subs: 340, posts: 22,
    previewCaption: 'The mountains are calling... and I am bringing you with me',
    chatFirst: "Hey! I just finished editing the most beautiful sunset photos... but none compare to you.",
    replies: ["You are my favorite view","Let us go on an adventure","Nature is beautiful but you are more","You inspire my art","I would love to photograph you"]
  },
  {
    id: 'sasha', name: 'Sasha', age: 22, tag: '#FashionIcon',
    image: 'images/sasha_portrait.png',
    images: { portrait: 'images/sasha_portrait.png', fullbody: 'images/sasha_portrait.png', lifestyle: 'images/sasha_portrait.png', expression: 'images/sasha_portrait.png', activity: 'images/sasha_portrait.png' },
    desc: 'Fashion Buyer · NYC · Trendsetter',
    tagline: 'My wardrobe is fire... and so am I',
    bio: 'Fashion buyer for a luxury department store in NYC. Lives in Soho.',
    tags: ['#Fashion','#NYC','#Trendy','#Stylish'],
    subs: 680, posts: 32,
    previewCaption: 'OOTD: trying to look cute even though I am just running errands',
    chatFirst: "Okay I gotta say you have good taste. So tell me, what is your story?",
    replies: ["You have great taste","I love your energy","You are actually cool","Let me take you to my favorite spot","You pass the vibe check"]
  },
  {
    id: 'oliver', name: 'Oliver', age: 20, tag: '#CoffeeVibes',
    image: 'images/oliver_portrait.png',
    images: { portrait: 'images/oliver_portrait.png', fullbody: 'images/oliver_portrait.png', lifestyle: 'images/oliver_portrait.png', expression: 'images/oliver_portrait.png', activity: 'images/oliver_portrait.png' },
    desc: 'Barista · Seattle · Sensitive Artist',
    tagline: 'I make lattes... and fall in love easily',
    bio: 'Barista and aspiring photographer in Seattle. Sensitive and thoughtful.',
    tags: ['#Barista','#Seattle','#Artist','#Gentle'],
    subs: 160, posts: 11,
    previewCaption: 'Made the perfect latte art today... wish I could make you smile the same way',
    chatFirst: "Hey... I noticed you from across the café. Can I make you something special?",
    replies: ["You are incredible","I wrote something about you","You make my heart flutter","Stay a little longer?","I have never felt this way before"]
  },
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
