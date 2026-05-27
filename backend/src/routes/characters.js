import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Character data mirroring the frontend
const characters = [
  { id: 'yuna', name: 'Yuna', age: 21, tag: '#AsianVibes', desc: 'International Student · Elegant · Gentle Soul', tagline: 'A little elegance, a little mystery ✨', subs: 450, posts: 22, tags: ['#Asian', '#InternationalStudent', '#Elegant', '#Gentle'] },
  { id: 'aria', name: 'Aria', age: 20, tag: '#GirlNextDoor', desc: 'UCLA sophomore · Sweet & Warm · Your new bestie', tagline: 'The girl you wish lived next door 💕', subs: 1200, posts: 43, tags: ['#Sweet', '#UCLA', '#Warm', '#CollegeGirl'] },
  { id: 'alexandra', name: 'Alexandra', age: 29, tag: '#NYCExecutive', desc: 'Manhattan Marketing Exec · Elegant · Sharp', tagline: "She's out of your league... or is she? 👠", subs: 890, posts: 38, tags: ['#NYC', '#Executive', '#Elegant', '#PowerWoman'] },
  { id: 'lucas', name: 'Lucas', age: 24, tag: '#ColumbiaGrad', desc: 'Psychology Grad · Deep Talks · Warm Soul', tagline: 'The guy who actually listens 📚', subs: 670, posts: 31, tags: ['#BoyNextDoor', '#Columbia', '#DeepTalks', '#Thoughtful'] },
  { id: 'nova', name: 'Nova', age: 23, tag: '#Baddie', desc: 'LA Influencer · Glam · Confident', tagline: 'Eyes on me. I know you want to. ⭐', subs: 2100, posts: 56, tags: ['#Baddie', '#LA', '#Influencer', '#Glam'] },
  { id: 'mason', name: 'Mason', age: 26, tag: '#Fitness', desc: 'Venice Beach Trainer · Fit · Motivating', tagline: 'Let me help you become your best self 💪', subs: 540, posts: 28, tags: ['#Fitness', '#VeniceBeach', '#Trainer', '#Motivation'] },
  { id: 'mochi', name: 'Mochi', age: 22, tag: '#Egirl', desc: 'Twitch Streamer · Gamer · Cute & Shy', tagline: 'Shy IRL, wild online. Wanna game? 🐱', subs: 1500, posts: 49, tags: ['#Egirl', '#Gamer', '#Twitch', '#Austin'] }
]

// GET /api/characters — list all characters
router.get('/', authenticateToken, (req, res) => {
  res.json({ characters })
})

// GET /api/characters/:id — single character detail
router.get('/:id', authenticateToken, (req, res) => {
  const c = characters.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Character not found' })
  res.json({ character: c })
})

export default router
