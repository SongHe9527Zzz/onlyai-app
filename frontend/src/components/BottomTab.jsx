import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/explore', icon: '🔍', label: 'Explore' },
  { path: '/chat', icon: '💬', label: 'Chat' },
  { path: null, icon: '👤', label: 'Me' }
]

export default function BottomTab() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => {
    if (!path) return false
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleTab = (tab) => {
    if (!tab.path) {
      // "Me" tab — could show user profile or login prompt
      showToast('👤 Profile coming soon')
      return
    }
    if (tab.path === '/chat') {
      // Chat tab navigates to active chat or just stays
      const searchParams = new URLSearchParams(location.search)
      const charId = searchParams.get('char')
      if (charId) {
        navigate(`/chat/${charId}`)
      } else {
        navigate('/explore')
      }
      return
    }
    navigate(tab.path)
  }

  return (
    <div className="bottom-tab">
      {tabs.map((tab, i) => (
        <button
          key={i}
          className={`tab-item ${isActive(tab.path) ? 'active' : ''}`}
          onClick={() => handleTab(tab)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

// Simple toast for the bottom tab
function showToast(msg) {
  const el = document.getElementById('toast')
  if (el) {
    el.textContent = msg
    el.classList.add('show')
    setTimeout(() => el.classList.remove('show'), 2500)
  }
}
