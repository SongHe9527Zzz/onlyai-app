import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Character data (mirrors characters.js for search)
const characters = [
  { id: 'yuna', name: 'Yuna', age: 21, tag: '#AsianVibes', desc: 'International Student · Elegant · Gentle Soul', tagline: 'A little elegance, a little mystery ✨', subs: 450, posts: 22, tags: ['#Asian', '#InternationalStudent', '#Elegant', '#Gentle'] },
  { id: 'aria', name: 'Aria', age: 20, tag: '#GirlNextDoor', desc: 'UCLA sophomore · Sweet & Warm · Your new bestie', tagline: 'The girl you wish lived next door 💕', subs: 1200, posts: 43, tags: ['#Sweet', '#UCLA', '#Warm', '#CollegeGirl'] },
  { id: 'alexandra', name: 'Alexandra', age: 29, tag: '#NYCExecutive', desc: 'Manhattan Marketing Exec · Elegant · Sharp', tagline: "She's out of your league... or is she? 👠", subs: 890, posts: 38, tags: ['#NYC', '#Executive', '#Elegant', '#PowerWoman'] },
  { id: 'lucas', name: 'Lucas', age: 24, tag: '#ColumbiaGrad', desc: 'Psychology Grad · Deep Talks · Warm Soul', tagline: 'The guy who actually listens 📚', subs: 670, posts: 31, tags: ['#BoyNextDoor', '#Columbia', '#DeepTalks', '#Thoughtful'] },
  { id: 'nova', name: 'Nova', age: 23, tag: '#Baddie', desc: 'LA Influencer · Glam · Confident', tagline: 'Eyes on me. I know you want to. ⭐', subs: 2100, posts: 56, tags: ['#Baddie', '#LA', '#Influencer', '#Glam'] },
  { id: 'mason', name: 'Mason', age: 26, tag: '#Fitness', desc: 'Venice Beach Trainer · Fit · Motivating', tagline: 'Let me help you become your best self 💪', subs: 540, posts: 28, tags: ['#Fitness', '#VeniceBeach', '#Trainer', '#Motivation'] },
  { id: 'mochi', name: 'Mochi', age: 22, tag: '#Egirl', desc: 'Twitch Streamer · Gamer · Cute & Shy', tagline: 'Shy IRL, wild online. Wanna game? 🐱', subs: 1500, posts: 49, tags: ['#Egirl', '#Gamer', '#Twitch', '#Austin'] },
  { id: 'ethan', name: 'Ethan', age: 22, tag: '#MusicVibes', desc: 'NYU Music Student · Artistic · Romantic', tagline: 'Let me write you a song', subs: 320, posts: 18, tags: ['#Music', '#NYU', '#Artistic', '#Romantic'] },
  { id: 'sophie', name: 'Sophie', age: 19, tag: '#CollegeVibes', desc: 'BU Freshman · Bookworm · Cute', tagline: 'Studying hard... but never too busy for you', subs: 280, posts: 15, tags: ['#College', '#Bookworm', '#Cute', '#Smart'] },
  { id: 'diego', name: 'Diego', age: 28, tag: '#LatinHeat', desc: 'Dance Instructor · Miami · Passionate', tagline: 'Dance with me and feel the rhythm', subs: 550, posts: 30, tags: ['#Latin', '#Dancer', '#Miami', '#Passionate'] },
  { id: 'kai', name: 'Kai', age: 25, tag: '#TechNerd', desc: 'AI Engineer · SF · Surprisingly Smooth', tagline: 'I write code by day... and poetry by night', subs: 200, posts: 12, tags: ['#Tech', '#Engineer', '#SanFrancisco', '#Nerdy'] },
  { id: 'marcus', name: 'Marcus', age: 27, tag: '#Gentleman', desc: 'Lawyer · Chicago · Old School Charm', tagline: 'A gentleman never tells... but I will', subs: 380, posts: 20, tags: ['#Lawyer', '#Chicago', '#Gentleman', '#Sophisticated'] },
  { id: 'jay', name: 'Jay', age: 23, tag: '#HipHop', desc: 'Rapper · Atlanta · Smooth Talker', tagline: 'I spit fire on stage... but I am soft for you', subs: 780, posts: 35, tags: ['#Rapper', '#Atlanta', '#Music', '#Smooth'] },
  { id: 'raven', name: 'Raven', age: 26, tag: '#CodeQueen', desc: 'Programmer · Seattle · Dark & Witty', tagline: 'I debug code... and read minds', subs: 190, posts: 14, tags: ['#Tech', '#Programmer', '#Seattle', '#DarkHumor'] },
  { id: 'isabella', name: 'Isabella', age: 24, tag: '#Latina', desc: 'Model · Miami · Fuego', tagline: 'Caliente by nature... sweet by choice', subs: 1200, posts: 45, tags: ['#Latina', '#Model', '#Miami', '#Passionate'] },
  { id: 'zoe', name: 'Zoe', age: 21, tag: '#SurferGirl', desc: 'Surfer · San Diego · Sun & Fun', tagline: 'Catch me at the beach... or catching feelings', subs: 450, posts: 28, tags: ['#Surfer', '#SanDiego', '#Beach', '#Adventurous'] },
  { id: 'lily', name: 'Lily', age: 28, tag: '#BossLady', desc: 'VC Investor · SF · Power & Grace', tagline: 'I close deals... and hearts', subs: 520, posts: 25, tags: ['#VC', '#Investor', '#SanFrancisco', '#Boss'] },
  { id: 'hazel', name: 'Hazel', age: 25, tag: '#CreativeSoul', desc: 'Photographer · Denver · Free Spirit', tagline: 'I capture moments... and hearts', subs: 340, posts: 22, tags: ['#Photographer', '#Denver', '#Creative', '#Nature'] },
  { id: 'sasha', name: 'Sasha', age: 22, tag: '#FashionIcon', desc: 'Fashion Buyer · NYC · Trendsetter', tagline: 'My wardrobe is fire... and so am I', subs: 680, posts: 32, tags: ['#Fashion', '#NYC', '#Trendy', '#Stylish'] },
  { id: 'oliver', name: 'Oliver', age: 20, tag: '#CoffeeVibes', desc: 'Barista · Seattle · Sensitive Artist', tagline: 'I make lattes... and fall in love easily', subs: 160, posts: 11, tags: ['#Barista', '#Seattle', '#Artist', '#Gentle'] }
]

// GET /api/search?q=keyword
// Searches across name, tags, desc, tagline
router.get('/', authenticateToken, (req, res) => {
  const { q } = req.query

  if (!q || !q.trim()) {
    return res.json({ results: characters, total: characters.length })
  }

  const query = q.trim().toLowerCase()

  const results = characters.filter(c => {
    // Search in name
    if (c.name.toLowerCase().includes(query)) return true
    // Search in tags (including tag and tags array)
    if (c.tags?.some(t => t.toLowerCase().includes(query))) return true
    if (c.tag?.toLowerCase().includes(query)) return true
    // Search in desc
    if (c.desc?.toLowerCase().includes(query)) return true
    // Search in tagline
    if (c.tagline?.toLowerCase().includes(query)) return true
    return false
  })

  res.json({
    results,
    total: results.length,
    query: q.trim()
  })
})

// GET /api/search/tags — get all unique tags for category browsing
router.get('/tags', authenticateToken, (req, res) => {
  const tagSet = new Set()
  characters.forEach(c => {
    if (c.tag) tagSet.add(c.tag)
    c.tags?.forEach(t => tagSet.add(t))
  })
  const tags = Array.from(tagSet).sort()
  res.json({ tags })
})

export default router
