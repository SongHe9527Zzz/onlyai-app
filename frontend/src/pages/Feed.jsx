import React, { useMemo } from 'react'
import PostCard from '../components/PostCard'
import characters, { feedCaptions } from '../data/characters'

const sceneKeys = ['fullbody', 'lifestyle', 'expression', 'activity']

function buildFeed() {
  const posts = []
  for (let i = 0; i < 20; i++) {
    const c = characters[i % characters.length]
    const cap = feedCaptions[i % feedCaptions.length]
    // Rotate through different scene images for variety
    const sceneKey = sceneKeys[i % sceneKeys.length]
    const imgToUse = c.images && c.images[sceneKey] ? c.images[sceneKey] : c.image
    posts.push({
      charId: c.id,
      name: c.name,
      tag: c.tag,
      image: imgToUse,
      caption: cap.txt,
      locked: cap.locked,
      likes: Math.floor(Math.random() * 200) + 20,
      comments: Math.floor(Math.random() * 40) + 2,
      time: Math.floor(Math.random() * 3) + 1 + 'h ago'
    })
  }
  return posts
}

export default function Feed() {
  const feedPosts = useMemo(() => buildFeed(), [])

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="feed-header">
        <h2>🔥 Latest</h2>
        <span>Following</span>
      </div>
      <div className="feed">
        {feedPosts.map((post, i) => (
          <PostCard key={i} post={post} />
        ))}
      </div>
    </div>
  )
}
