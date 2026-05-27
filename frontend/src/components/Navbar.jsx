import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/login')}>
          Only<span>AI</span>
        </div>
        <div className="nav-icons">
          <button className="nav-btn" onClick={() => navigate('/login')}>🔍</button>
        </div>
      </nav>
    )
  }

  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => navigate('/')}>
        Only<span>AI</span>
      </div>
      <div className="nav-icons" style={{ position: 'relative' }}>
        <button className="nav-btn" onClick={() => navigate('/explore')}>🔍</button>
        <button
          className="avatar-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title={user.username || user.email}
        >
          {(user.username || user.email || 'U')[0].toUpperCase()}
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            background: '#1a1a22',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 8,
            minWidth: 160,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 4
            }}>
              {user.email}
            </div>
            <button style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: '#ff4d4d',
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 8,
              textAlign: 'left'
            }}
              onClick={handleLogout}
              onMouseEnter={e => e.target.style.background = 'rgba(255,77,77,0.1)'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
