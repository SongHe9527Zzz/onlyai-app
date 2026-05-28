import React, { useState, useEffect } from 'react'
import PostCard from '../components/PostCard'
import posts from '../data/posts'
import characters from '../data/characters'

// Augment each post with character display data for rendering
function augmentPost(post) {
  const c = characters.find(ch => ch.id === post.characterId)
  if (!c) return null
  // Pick a scene image for variety
  const sceneKeys = ['portrait', 'fullbody', 'lifestyle', 'expression', 'activity']
  const idx = Math.abs(post.id.split('_').pop()) % sceneKeys.length
  const sceneKey = sceneKeys[idx]
  const img = (c.images && c.images[sceneKey]) ? c.images[sceneKey] : c.image
  return {
    ...post,
    name: c.name,
    tag: c.tag,
    image: img
  }
}

// Interleave posts: max N per char then alternate to avoid one character dominating
function interleavePosts(posts, maxPerChar) {
  const groups = {}
  posts.forEach(p => {
    if (!groups[p.characterId]) groups[p.characterId] = []
    groups[p.characterId].push(p)
  })
  const result = []
  const charIds = Object.keys(groups)
  const perChar = {}
  charIds.forEach(id => { perChar[id] = 0 })
  let done = false
  while (!done) {
    done = true
    for (const id of charIds) {
      if (perChar[id] < maxPerChar && perChar[id] < groups[id].length) {
        result.push(groups[id][perChar[id]])
        perChar[id]++
        done = false
      }
    }
  }
  return result
}

export default function Feed() {
  // Live state: merge static defaults with any server-side changes (likes, comments)
  const [feedPosts, setFeedPosts] = useState([])

  useEffect(() => {
    // Try fetching from API first for dynamic counts
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/posts')
        if (res.ok) {
          const data = await res.json()
          // Merge server posts with character images
          const augmented = data.posts.map(p => augmentPost(p)).filter(Boolean)
          if (augmented.length > 0) {
            setFeedPosts(interleavePosts(augmented, 2))
            return
          }
        }
      } catch (e) {
        // Fall through to static
      }
      // Fallback: use static data — interleave to avoid one character clumping
      const augmented = posts.map(p => augmentPost(p)).filter(Boolean)
      const interleaved = interleavePosts(augmented, 2)
      setFeedPosts(interleaved)
    }
    fetchPosts()
  }, [])

  const handleLike = (postId) => {
    setFeedPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes: (p.likes || 0) + 1, liked: true }
          : p
      )
    )
    // Fire-and-forget API call
    fetch(`/api/posts/${postId}/like`, { method: 'POST' }).catch(() => {})
  }

  const handleComment = (postId) => {
    // The PostCard will handle the comment modal; this callback
    // is passed down so the parent can update counts.
    // We'll handle the actual comment submission inside PostCard.
  }

  const updateComments = (postId) => {
    setFeedPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, comments: (p.comments || 0) + 1 }
          : p
      )
    )
  }

  if (feedPosts.length === 0) {
    return (
      <div className="page-content" style={{ paddingBottom: 120 }}>
        <div className="feed-header">
          <h2>🔥 Latest</h2>
          <span>Following</span>
        </div>
        <div className="loading-screen" style={{ padding: '60px 0' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: 16, color: '#999' }}>Loading posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="feed-header">
        <h2>🔥 Latest</h2>
        <span>Following</span>
      </div>
      <div className="feed">
        {feedPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onComment={updateComments}
          />
        ))}
      </div>
    </div>
  )
}
