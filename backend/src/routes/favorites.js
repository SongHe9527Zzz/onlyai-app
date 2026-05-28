import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Character data for validation
const validCharacterIds = [
  'aria', 'yuna', 'alexandra', 'lucas', 'nova', 'mason', 'mochi',
  'ethan', 'sophie', 'diego', 'kai', 'marcus', 'jay', 'raven',
  'isabella', 'zoe', 'lily', 'hazel', 'sasha', 'oliver'
]

// Character lookup map
const characterMap = {
  'aria': { id: 'aria', name: 'Aria', age: 20, tag: '#GirlNextDoor', desc: 'UCLA sophomore · Sweet & Warm · Your new bestie', tagline: 'The girl you wish lived next door 💕', subs: 1200, posts: 43, tags: ['#Sweet', '#UCLA', '#Warm', '#CollegeGirl'] },
  'yuna': { id: 'yuna', name: 'Yuna', age: 21, tag: '#AsianVibes', desc: 'International Student · Elegant · Gentle Soul', tagline: 'A little elegance, a little mystery ✨', subs: 450, posts: 22, tags: ['#Asian', '#InternationalStudent', '#Elegant', '#Gentle'] },
  'alexandra': { id: 'alexandra', name: 'Alexandra', age: 29, tag: '#NYCExecutive', desc: 'Manhattan Marketing Exec · Elegant · Sharp', tagline: "She's out of your league... or is she? 👠", subs: 890, posts: 38, tags: ['#NYC', '#Executive', '#Elegant', '#PowerWoman'] },
  'lucas': { id: 'lucas', name: 'Lucas', age: 24, tag: '#ColumbiaGrad', desc: 'Psychology Grad · Deep Talks · Warm Soul', tagline: 'The guy who actually listens 📚', subs: 670, posts: 31, tags: ['#BoyNextDoor', '#Columbia', '#DeepTalks', '#Thoughtful'] },
  'nova': { id: 'nova', name: 'Nova', age: 23, tag: '#Baddie', desc: 'LA Influencer · Glam · Confident', tagline: 'Eyes on me. I know you want to. ⭐', subs: 2100, posts: 56, tags: ['#Baddie', '#LA', '#Influencer', '#Glam'] },
  'mason': { id: 'mason', name: 'Mason', age: 26, tag: '#Fitness', desc: 'Venice Beach Trainer · Fit · Motivating', tagline: 'Let me help you become your best self 💪', subs: 540, posts: 28, tags: ['#Fitness', '#VeniceBeach', '#Trainer', '#Motivation'] },
  'mochi': { id: 'mochi', name: 'Mochi', age: 22, tag: '#Egirl', desc: 'Twitch Streamer · Gamer · Cute & Shy', tagline: 'Shy IRL, wild online. Wanna game? 🐱', subs: 1500, posts: 49, tags: ['#Egirl', '#Gamer', '#Twitch', '#Austin'] },
  'ethan': { id: 'ethan', name: 'Ethan', age: 22, tag: '#MusicVibes', desc: 'NYU Music Student · Artistic · Romantic', tagline: 'Let me write you a song', subs: 320, posts: 18, tags: ['#Music', '#NYU', '#Artistic', '#Romantic'] },
  'sophie': { id: 'sophie', name: 'Sophie', age: 19, tag: '#CollegeVibes', desc: 'BU Freshman · Bookworm · Cute', tagline: 'Studying hard... but never too busy for you', subs: 280, posts: 15, tags: ['#College', '#Bookworm', '#Cute', '#Smart'] },
  'diego': { id: 'diego', name: 'Diego', age: 28, tag: '#LatinHeat', desc: 'Dance Instructor · Miami · Passionate', tagline: 'Dance with me and feel the rhythm', subs: 550, posts: 30, tags: ['#Latin', '#Dancer', '#Miami', '#Passionate'] },
  'kai': { id: 'kai', name: 'Kai', age: 25, tag: '#TechNerd', desc: 'AI Engineer · SF · Surprisingly Smooth', tagline: 'I write code by day... and poetry by night', subs: 200, posts: 12, tags: ['#Tech', '#Engineer', '#SanFrancisco', '#Nerdy'] },
  'marcus': { id: 'marcus', name: 'Marcus', age: 27, tag: '#Gentleman', desc: 'Lawyer · Chicago · Old School Charm', tagline: 'A gentleman never tells... but I will', subs: 380, posts: 20, tags: ['#Lawyer', '#Chicago', '#Gentleman', '#Sophisticated'] },
  'jay': { id: 'jay', name: 'Jay', age: 23, tag: '#HipHop', desc: 'Rapper · Atlanta · Smooth Talker', tagline: 'I spit fire on stage... but I am soft for you', subs: 780, posts: 35, tags: ['#Rapper', '#Atlanta', '#Music', '#Smooth'] },
  'raven': { id: 'raven', name: 'Raven', age: 26, tag: '#CodeQueen', desc: 'Programmer · Seattle · Dark & Witty', tagline: 'I debug code... and read minds', subs: 190, posts: 14, tags: ['#Tech', '#Programmer', '#Seattle', '#DarkHumor'] },
  'isabella': { id: 'isabella', name: 'Isabella', age: 24, tag: '#Latina', desc: 'Model · Miami · Fuego', tagline: 'Caliente by nature... sweet by choice', subs: 1200, posts: 45, tags: ['#Latina', '#Model', '#Miami', '#Passionate'] },
  'zoe': { id: 'zoe', name: 'Zoe', age: 21, tag: '#SurferGirl', desc: 'Surfer · San Diego · Sun & Fun', tagline: 'Catch me at the beach... or catching feelings', subs: 450, posts: 28, tags: ['#Surfer', '#SanDiego', '#Beach', '#Adventurous'] },
  'lily': { id: 'lily', name: 'Lily', age: 28, tag: '#BossLady', desc: 'VC Investor · SF · Power & Grace', tagline: 'I close deals... and hearts', subs: 520, posts: 25, tags: ['#VC', '#Investor', '#SanFrancisco', '#Boss'] },
  'hazel': { id: 'hazel', name: 'Hazel', age: 25, tag: '#CreativeSoul', desc: 'Photographer · Denver · Free Spirit', tagline: 'I capture moments... and hearts', subs: 340, posts: 22, tags: ['#Photographer', '#Denver', '#Creative', '#Nature'] },
  'sasha': { id: 'sasha', name: 'Sasha', age: 22, tag: '#FashionIcon', desc: 'Fashion Buyer · NYC · Trendsetter', tagline: 'My wardrobe is fire... and so am I', subs: 680, posts: 32, tags: ['#Fashion', '#NYC', '#Trendy', '#Stylish'] },
  'oliver': { id: 'oliver', name: 'Oliver', age: 20, tag: '#CoffeeVibes', desc: 'Barista · Seattle · Sensitive Artist', tagline: 'I make lattes... and fall in love easily', subs: 160, posts: 11, tags: ['#Barista', '#Seattle', '#Artist', '#Gentle'] }
}

// In-memory favorites store: Map<userId, Set<characterId>>
const favorites = new Map()

// GET /api/favorites — get user's favorite characters
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id
  const userFavorites = favorites.get(userId) || new Set()
  const favArray = Array.from(userFavorites)

  // Return full character data
  const favoriteCharacters = favArray
    .map(id => characterMap[id])
    .filter(Boolean)

  res.json({
    favorites: favoriteCharacters,
    favoriteIds: favArray,
    total: favArray.length
  })
})

// POST /api/favorites — add a character to favorites
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id
  const { characterId } = req.body

  if (!characterId) {
    return res.status(400).json({ error: 'characterId is required' })
  }

  if (!validCharacterIds.includes(characterId)) {
    return res.status(404).json({ error: 'Character not found' })
  }

  if (!favorites.has(userId)) {
    favorites.set(userId, new Set())
  }

  const userFavorites = favorites.get(userId)
  if (userFavorites.has(characterId)) {
    return res.json({ message: 'Already in favorites', characterId, favorited: true })
  }

  userFavorites.add(characterId)
  res.json({ message: 'Added to favorites', characterId, favorited: true })
})

// DELETE /api/favorites/:characterId — remove from favorites
router.delete('/:characterId', authenticateToken, (req, res) => {
  const userId = req.user.id
  const { characterId } = req.params

  if (!favorites.has(userId)) {
    return res.status(404).json({ error: 'No favorites found' })
  }

  const userFavorites = favorites.get(userId)
  if (!userFavorites.has(characterId)) {
    return res.status(404).json({ error: 'Character not in favorites' })
  }

  userFavorites.delete(characterId)
  res.json({ message: 'Removed from favorites', characterId, favorited: false })
})

// GET /api/favorites/check/:characterId — check if a character is favorited
router.get('/check/:characterId', authenticateToken, (req, res) => {
  const userId = req.user.id
  const { characterId } = req.params
  const userFavorites = favorites.get(userId) || new Set()
  res.json({ characterId, favorited: userFavorites.has(characterId) })
})

export default router
