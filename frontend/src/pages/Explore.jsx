import React from 'react'
import { useNavigate } from 'react-router-dom'
import characters from '../data/characters'

export default function Explore() {
  const navigate = useNavigate()

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="explore">
        <h2>🎭 Discover Characters</h2>
        <p>Find your next favorite AI companion. Subscribe to unlock everything.</p>

        {characters.map(c => (
          <div
            key={c.id}
            className="creator-card"
            onClick={() => navigate(`/profile/${c.id}`)}
          >
            <div className="cc-av">
              <img src={c.image} alt={c.name} />
            </div>
            <div className="cc-info">
              <div className="cc-name">{c.name}, {c.age}</div>
              <div className="cc-desc">{c.desc}</div>
              <span className="cc-tag">{c.tags[0]}</span>
              <span className="cc-tag">{c.tags[1]}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="cc-price">
                $7.9<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>+ character sub</div>
            </div>
          </div>
        ))}

        <div className="creator-cta">
          <div className="icon">🎨</div>
          <h3>Become a Creator</h3>
          <p>Design AI characters and earn up to 95% of subscription revenue. No camera needed.</p>
          <button
            className="subscribe-btn"
            onClick={() => {
              const evt = new CustomEvent('onlyai:toast', { detail: '✨ Creator onboarding coming soon!' })
              window.dispatchEvent(evt)
            }}
          >
            ✨ Start Creating
          </button>
        </div>
      </div>
    </div>
  )
}
