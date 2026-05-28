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
        <button className="nav-btn" onClick={() => navigate('/search')}>🔍</button>
        <button className="nav-btn" onClick={() => navigate('/notifications')}>
          <span style={{ position: 'relative' }}>
            🔔
          </span>
        </button>
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
            minWidth: 200,
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
            <MenuItem
              icon="👤"
              label="Edit Profile"
              color="#ff6b9d"
              hoverColor="rgba(255,107,157,0.1)"
              onClick={() => { setMenuOpen(false); navigate('/edit-profile') }}
            />
            <MenuItem
              icon="📋"
              label="My Subscriptions"
              color="#ff6b9d"
              hoverColor="rgba(255,107,157,0.1)"
              onClick={() => { setMenuOpen(false); navigate('/manage-subscription') }}
            />
            <MenuItem
              icon="⭐"
              label="Favorites"
              color="#ffd700"
              hoverColor="rgba(255,215,0,0.1)"
              onClick={() => { setMenuOpen(false); navigate('/favorites') }}
            />
            <MenuItem
              icon="⚙️"
              label="Settings"
              color="#a5b4fc"
              hoverColor="rgba(99,102,241,0.1)"
              onClick={() => { setMenuOpen(false); navigate('/settings') }}
            />
            <MenuItem
              icon="📊"
              label="Admin"
              color="#a5b4fc"
              hoverColor="rgba(99,102,241,0.1)"
              onClick={() => { setMenuOpen(false); navigate('/admin') }}
            />
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              margin: '4px 0',
              paddingTop: 4
            }}>
              <MenuItem
                icon="🚪"
                label="Sign Out"
                color="#ff4d4d"
                hoverColor="rgba(255,77,77,0.1)"
                onClick={handleLogout}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// Reusable menu item component
function MenuItem({ icon, label, color, hoverColor, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button style={{
      display: 'block',
      width: '100%',
      padding: '8px 12px',
      background: hovered ? hoverColor : 'none',
      border: 'none',
      color: color,
      fontSize: 13,
      cursor: 'pointer',
      borderRadius: 8,
      textAlign: 'left',
      transition: 'background 0.15s'
    }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon} {label}
    </button>
  )
}
