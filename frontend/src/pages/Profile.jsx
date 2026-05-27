import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import characters from '../data/characters'

export default function Profile() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()

  const c = characters.find(x => x.id === charId)
  if (!c) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Character not found
      </div>
    )
  }

  const subscribed = isSubscribed(c.id)
  const charPrice = c.subs > 1000 ? '5.9' : '7.9'

  const handleSubscribe = () => {
    navigate(`/subscribe/${c.id}`)
  }

  const handleChat = () => {
    navigate(`/chat/${c.id}`)
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="profile-cover">
        <img src={c.image} alt={c.name} />
        <div className="overlay"></div>
      </div>
      <div className="profile-info">
        <div className="profile-avatar">
          <img src={c.image} alt={c.name} />
        </div>
        <h1>{c.name}, {c.age}</h1>
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

        <div className="pricing-info">
          <div className="title">💡 How pricing works</div>
          <div className="detail">
            <strong className="highlight">$7.9/mo</strong> platform fee → unlocks chat &amp; feed<br />
            <strong>${charPrice}/mo</strong> character sub → goes to creator (90-95%)
          </div>
        </div>

        {subscribed ? (
          <>
            <button
              className="subscribe-btn subscribed"
              onClick={handleChat}
            >
              💬 Start Chatting with {c.name}
            </button>
            <button className="chat-btn" onClick={() => navigate('/')}>
              ← Back to Feed
            </button>
          </>
        ) : (
          <button className="subscribe-btn" onClick={handleSubscribe}>
            🔓 Subscribe · $7.9 + ${charPrice} <span className="price">/mo total</span>
          </button>
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

      <div className="profile-posts-section">
        <h3>📸 Posts</h3>
        <div className="profile-posts">
          {[0, 1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="grid-item">
              🔒
              <div className={`lock-small ${i < 2 ? 'free' : 'locked'}`}>
                {i < 2 ? 'Free' : '🔒'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
