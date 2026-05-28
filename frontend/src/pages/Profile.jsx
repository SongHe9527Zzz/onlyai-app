import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Paywall from '../components/Paywall'
import TipModal from '../components/TipModal'
import characters from '../data/characters'
import { addFavorite, removeFavorite, checkFavorite } from '../services/api'

const sceneKeys = ['fullbody', 'lifestyle', 'expression', 'activity', 'portrait']

function ImgWithFallback({ src, alt, className, style, fallback }) {
  const [failed, setFailed] = React.useState(false)
  if (failed || !src) {
    return <div className={className || 'post-thumb-placeholder'} style={style || { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>{fallback || '📸'}</div>
  }
  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />
}

export default function Profile() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const [showTipModal, setShowTipModal] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  useEffect(() => {
    if (charId) {
      checkFavorite(charId).then(data => {
        setFavorited(data.favorited)
      }).catch(() => {})
    }
  }, [charId])

  async function toggleFavorite(e) {
    e.stopPropagation()
    if (favLoading) return
    setFavLoading(true)
    try {
      if (favorited) {
        await removeFavorite(charId)
        setFavorited(false)
      } else {
        await addFavorite(charId)
        setFavorited(true)
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err)
    } finally {
      setFavLoading(false)
    }
  }

  const c = characters.find(x => x.id === charId)
  if (!c) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Character not found
      </div>
    )
  }

  const subscribed = isSubscribed(c.id)

  const handleSubscribe = () => {
    navigate(`/subscribe/${c.id}`)
  }

  const handleChat = () => {
    navigate(`/chat/${c.id}`)
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="profile-cover">
        <ImgWithFallback src={c.image} alt={c.name} className="" style={{width:'100%',height:'100%',objectFit:'cover'}} fallback="🎭" />
        <div className="overlay"></div>
      </div>
      <div className="profile-info">
        <div className="profile-avatar">
          <ImgWithFallback src={c.image} alt={c.name} className="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} fallback="🎭" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ marginBottom: 0 }}>{c.name}, {c.age}</h1>
          <button
            onClick={toggleFavorite}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: favLoading ? 'wait' : 'pointer',
              padding: 4,
              transition: 'transform 0.2s',
              transform: favorited ? 'scale(1.1)' : 'scale(1)'
            }}
            title={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favorited ? '⭐' : '☆'}
          </button>
        </div>
        <div className="tagline">{c.tagline}</div>

        <div className="profile-stats">
          <div className="stat">
            <div className="num">{(c.subs / 1000).toFixed(1)}K</div>
            <div className="label">subscribers</div>
          </div>
          <div className="stat">
            <div className="num">{c.posts}</div>
            <div className="label">posts</div>
          </div>
          <div className="stat">
            <div className="num">⭐4.8</div>
            <div className="label">rating</div>
          </div>
        </div>

        <div className="bio">{c.bio}</div>

        <div className="tags-row">
          {c.tags.map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>

        {/* Tip Button */}
        <button
          className="tip-btn-profile"
          onClick={() => setShowTipModal(true)}
        >
          💸 Send a Tip to {c.name}
        </button>

        {/* Subscription CTA */}
        {subscribed ? (
          <>
            <button
              className="subscribe-btn subscribed"
              onClick={handleChat}
            >
              💬 Start Chatting with {c.name}
            </button>
            <button className="chat-btn" onClick={() => navigate('/manage-subscription')}>
              📋 Manage Subscription
            </button>
          </>
        ) : (
          <>
            <button className="subscribe-btn" onClick={handleSubscribe}>
              🔓 Subscribe · from $7.99
            </button>
            <div className="free-chat-teaser" style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              marginTop: -4,
              marginBottom: 12
            }}>
              💬 Try {5} free messages first, then subscribe to continue
            </div>
          </>
        )}

        <div className="relationship-bar">
          <div className="label">
            <span>💕 Relationship Level</span>
            <span>{subscribed ? 'Acquaintance' : 'Stranger'}</span>
          </div>
          <div className="track">
            <div className="fill" style={{ width: subscribed ? '15%' : '5%' }}></div>
          </div>
          <div className="relationship-levels">
            <span>Stranger</span>
            <span>Friend</span>
            <span>Close</span>
            <span>Intimate</span>
            <span>Soulmate</span>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <TipModal
          character={c}
          onClose={() => setShowTipModal(false)}
        />
      )}

      {/* Posts section with Paywall for locked items */}
      <div className="profile-posts-section">
        <h3>📸 Posts</h3>
        <div className="profile-posts">
          {[0, 1, 2, 3, 4, 5].map((_, i) => {
            const sceneKey = sceneKeys[i % sceneKeys.length]
            const sceneImg = c.images && c.images[sceneKey] ? c.images[sceneKey] : null
            return (
              <div key={i} className="grid-item">
                {i < 2 ? (
                  // Free posts — always visible, show scene image
                  <>
                    <ImgWithFallback src={sceneImg} alt={`${c.name} ${sceneKey}`} className="post-thumb-img" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} fallback="📸" />
                    <div className="lock-small free">Free</div>
                  </>
                ) : (
                  // Locked posts — show blurred preview with paywall overlay
                  <Paywall characterId={charId} type="content">
                    <div className="post-thumb-placeholder" style={{ position: 'relative' }}>
                      <ImgWithFallback src={sceneImg} alt={`${c.name} ${sceneKey}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, filter: 'blur(8px)', opacity: 0.6 }} fallback="🔒" />
                      <div className="lock-small locked" style={{ position: 'absolute', bottom: 4, right: 4 }}>🔒</div>
                    </div>
                  </Paywall>
                )}
              </div>
            )
          })}
        </div>

        {/* Paywall CTA for all locked content */}
        {!subscribed && (
          <div className="profile-paywall-cta" style={{
            marginTop: 16,
            padding: 16,
            background: 'rgba(196, 77, 255, 0.06)',
            border: '1px solid rgba(196, 77, 255, 0.1)',
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              🔒 <strong>{4 - Math.min(2, subscribed ? 0 : 0)} posts locked</strong> — subscribe to unlock all exclusive content
            </div>
            <button
              className="subscribe-btn"
              style={{ fontSize: 14, padding: 12 }}
              onClick={handleSubscribe}
            >
              🔓 Subscribe for Full Access
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
