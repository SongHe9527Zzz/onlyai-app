import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites } from '../services/api'

export default function Favorites() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  async function loadFavorites() {
    try {
      setLoading(true)
      const data = await getFavorites()
      setFavorites(data.favorites || [])
      setError(null)
    } catch (err) {
      setError('Failed to load favorites')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function navigateToProfile(charId) {
    navigate(`/profile/${charId}`)
  }

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        {error}
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⭐ Favorites</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          {favorites.length === 0
            ? 'You haven\'t favorited any characters yet'
            : `${favorites.length} character${favorites.length > 1 ? 's' : ''} in your favorites`
          }
        </p>
      </div>

      {favorites.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'rgba(255,255,255,0.3)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#fff6' }}>No Favorites Yet</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Browse characters and tap the star icon to add them to your favorites!
          </p>
          <button
            className="subscribe-btn"
            style={{ fontSize: 14, padding: 12, maxWidth: 200, margin: '0 auto' }}
            onClick={() => navigate('/explore')}
          >
            🔍 Explore Characters
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {favorites.map(c => (
            <div
              key={c.id}
              className="creator-card"
              onClick={() => navigateToProfile(c.id)}
            >
              <div className="cc-av">
                <img src={`images/${c.id}_portrait.png`} alt={c.name} />
              </div>
              <div className="cc-info">
                <div className="cc-name">{c.name}, {c.age}</div>
                <div className="cc-desc">{c.desc}</div>
                {c.tags && c.tags.slice(0, 2).map(t => (
                  <span key={t} className="cc-tag">{t}</span>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20 }}>⭐</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  {(c.subs || 0).toLocaleString()} subs
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
