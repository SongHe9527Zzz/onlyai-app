import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Paywall Component
 *
 * Shows a "Subscribe to unlock" overlay for locked content.
 * Used in PostCard, Profile, and Chat pages.
 *
 * Props:
 *   characterId  - The character whose content is locked
 *   plan         - Minimum plan required ('standard'|'premium'|'vip')
 *   children     - The content to show when unlocked
 *   type         - 'post' | 'chat' | 'content' (changes the UI style)
 *   message      - Custom lock message
 */
export default function Paywall({ characterId, plan = 'standard', children, type = 'post', message }) {
  const navigate = useNavigate()
  const { isSubscribed, user } = useAuth()
  const [showDetail, setShowDetail] = useState(false)

  const hasAccess = isSubscribed(characterId)

  const planLabels = {
    standard: 'Basic ($7.99/mo)',
    premium: 'Premium ($15.99/mo)',
    vip: 'VIP ($29.99/mo)'
  }

  const planNames = {
    standard: 'Basic',
    premium: 'Premium',
    vip: 'VIP'
  }

  if (hasAccess) {
    return <>{children}</>
  }

  // ─── Locked content overlay ─────────────────────────
  const lockedUI = (
    <div className="paywall-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="paywall-content">
        {type === 'post' && <div className="paywall-icon">🔒</div>}
        {type === 'chat' && <div className="paywall-icon">💬</div>}
        {type === 'content' && <div className="paywall-icon">✨</div>}

        <div className="paywall-title">
          {message || (type === 'chat'
            ? 'Chat Locked'
            : type === 'post'
              ? 'Exclusive Content'
              : 'Premium Content')}
        </div>

        <div className="paywall-desc">
          {type === 'chat'
            ? 'Subscribe to start a conversation with this character'
            : type === 'post'
              ? 'This post is for subscribers only'
              : 'Subscribe to unlock this exclusive content'}
        </div>

        <div className="paywall-plan-info">
          Requires <strong>{planNames[plan]}</strong> plan or higher
        </div>

        <button
          className="paywall-subscribe-btn"
          onClick={() => navigate(`/subscribe/${characterId}`)}
        >
          🔓 Subscribe — {planLabels[plan]}
        </button>

        {user && (
          <button
            className="paywall-manage-btn"
            onClick={() => navigate('/manage-subscription')}
          >
            My Subscriptions
          </button>
        )}
      </div>
    </div>
  )

  // For inline content paywalls, wrap the children
  if (type === 'content') {
    return (
      <div className="paywall-wrapper" style={{ position: 'relative' }}>
        <div className="paywall-blur-content" style={{
          filter: 'blur(8px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.3
        }}>
          {children}
        </div>
        {lockedUI}
      </div>
    )
  }

  // For full-block paywalls (post card, chat), just show the overlay
  return lockedUI
}

// ─── Free Chat Limit Banner ─────────────────────────────
// Shows how many free chats a user has left
export function FreeChatLimitBanner({ remaining, characterId }) {
  const navigate = useNavigate()

  if (remaining === null || remaining === undefined) return null

  if (remaining > 0) {
    return (
      <div className="free-chat-banner">
        <span>💬 Free chats remaining: <strong>{remaining}</strong></span>
        <button
          className="free-chat-subscribe-btn"
          onClick={() => navigate(`/subscribe/${characterId}`)}
        >
          Subscribe to unlock unlimited
        </button>
      </div>
    )
  }

  return (
    <div className="free-chat-banner exhausted">
      <span>🔒 You've used all your free chats</span>
      <button
        className="free-chat-subscribe-btn urgent"
        onClick={() => navigate(`/subscribe/${characterId}`)}
      >
        🔓 Subscribe Now — ${characterId === 'aria' || characterId === 'nova' || characterId === 'alexandra' || characterId === 'mochi' ? '15.99' : '7.99'}/mo
      </button>
    </div>
  )
}

// ─── Free Post Preview ──────────────────────────────────
// Shows a preview of a locked post with a "Subscribe to view" CTA
export function LockedPostPreview({ characterId, preview, caption }) {
  const navigate = useNavigate()
  const { isSubscribed } = useAuth()

  if (isSubscribed(characterId)) {
    return (
      <div className="post-img unlocked">
        <img src={preview} alt="Post" />
      </div>
    )
  }

  return (
    <div className="post-img locked">
      <img src={preview} alt="Post preview" style={{ filter: 'blur(12px)', opacity: 0.4 }} />
      <div className="lock-badge">🔒 Subscribers only</div>
      <div className="preview-label">Preview</div>
      <button
        className="subscribe-overlay-btn"
        onClick={() => navigate(`/subscribe/${characterId}`)}
      >
        🔓 Subscribe to view
      </button>
    </div>
  )
}
