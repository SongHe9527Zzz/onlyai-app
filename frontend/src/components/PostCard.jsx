import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PostCard({ post, onLike, onComment }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.liked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [commentCount, setCommentCount] = useState(post.comments || 0)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLike = (e) => {
    e.stopPropagation()
    if (liked) return
    setLiked(true)
    setLikeCount(c => c + 1)
    if (onLike) onLike(post.id)
  }

  const handleCommentSubmit = async (e) => {
    e.stopPropagation()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/posts/${post.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() })
      })
      setCommentCount(c => c + 1)
      setCommentText('')
      setShowCommentInput(false)
      if (onComment) onComment(post.id)
    } catch (err) {
      // Still increment locally even if server fails
      setCommentCount(c => c + 1)
      setCommentText('')
      setShowCommentInput(false)
      if (onComment) onComment(post.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="post-card">
      <div className="post-header" onClick={() => navigate(`/profile/${post.characterId || post.charId}`)}>
        <div className="post-avatar">
          <img src={post.image} alt={post.name} />
          <div className="online"></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="post-author">
            {post.name} <span>{post.tag}</span>
          </div>
          <div className="post-status">{post.timestamp}</div>
        </div>
      </div>
      <div
        className="post-img"
        onClick={() => navigate(`/profile/${post.characterId || post.charId}`)}
      >
        <img src={post.image} alt="" />
        {post.locked
          ? <div className="lock-badge">🔒 Subscribers only</div>
          : <div className="preview-label">🔓 Preview</div>
        }
      </div>
      <div className="post-caption">{post.content}</div>
      <div className="post-actions">
        <span
          className={`action-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          style={{ cursor: liked ? 'default' : 'pointer' }}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </span>
        <span
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation()
            setShowCommentInput(!showCommentInput)
          }}
          style={{ cursor: 'pointer' }}
        >
          💬 {commentCount}
        </span>
      </div>

      {showCommentInput && (
        <div className="comment-input-wrapper" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            className="comment-input"
            placeholder="Write a comment..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCommentSubmit(e)
            }}
            autoFocus
          />
          <button
            className="comment-submit"
            onClick={handleCommentSubmit}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? '...' : 'Send'}
          </button>
        </div>
      )}

      {post.locked && (
        <button
          className="subscribe-btn-inline"
          onClick={() => navigate(`/profile/${post.characterId || post.charId}`)}
        >
          🔓 Subscribe $7.9/mo + character access
        </button>
      )}
    </div>
  )
}
