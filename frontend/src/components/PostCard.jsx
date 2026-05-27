import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PostCard({ post }) {
  const navigate = useNavigate()

  return (
    <div className="post-card">
      <div className="post-header" onClick={() => navigate(`/profile/${post.charId}`)}>
        <div className="post-avatar">
          <img src={post.image} alt={post.name} />
          <div className="online"></div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="post-author">
            {post.name} <span>{post.tag}</span>
          </div>
          <div className="post-status">{post.time}</div>
        </div>
      </div>
      <div
        className="post-img"
        onClick={() => navigate(`/profile/${post.charId}`)}
      >
        <img src={post.image} alt="" />
        {post.locked
          ? <div className="lock-badge">🔒 Subscribers only</div>
          : <div className="preview-label">🔓 Preview</div>
        }
      </div>
      <div className="post-caption">{post.caption}</div>
      <div className="post-actions">
        <span>❤️ {post.likes}</span>
        <span>💬 {post.comments}</span>
      </div>
      {post.locked && (
        <button
          className="subscribe-btn-inline"
          onClick={() => navigate(`/profile/${post.charId}`)}
        >
          🔓 Subscribe $7.9/mo + character access
        </button>
      )}
    </div>
  )
}
