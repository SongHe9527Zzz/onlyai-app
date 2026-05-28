import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSocket } from '../services/websocket'

const tabs = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/explore', icon: '🔍', label: 'Explore' },
  { path: '/conversations', icon: '💬', label: 'Chat' },
  { path: '/orders', icon: '🧾', label: 'Orders' },
  { path: '/manage-subscription', icon: '👤', label: 'Me' }
]

export default function BottomTab() {
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadTotal, setUnreadTotal] = useState(0)

  // Listen for WebSocket updates to refresh unread count
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // We don't have a direct unread count push, so we'll update when
    // conversation updates come through
    const handleUpdate = () => {
      // The conversation list fetch handles this, but for live badge we
      // could fetch unread total periodically
    }

    socket.on('conv:updated', handleUpdate)
    socket.on('chat:reply', handleUpdate)

    return () => {
      socket.off('conv:updated', handleUpdate)
      socket.off('chat:reply', handleUpdate)
    }
  }, [])

  const isActive = (path) => {
    if (!path) return false
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleTab = (tab) => {
    if (!tab.path) return
    navigate(tab.path)
  }

  return (
    <div className="bottom-tab">
      {tabs.map((tab, i) => (
        <button
          key={i}
          className={`tab-item ${isActive(tab.path) ? 'active' : ''}`}
          onClick={() => handleTab(tab)}
          style={{ position: 'relative' }}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {/* Unread badge on Chat tab */}
          {tab.path === '/conversations' && unreadTotal > 0 && (
            <span style={{
              position: 'absolute',
              top: 0,
              right: '50%',
              marginRight: -22,
              background: '#ff6b9d',
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1
            }}>
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
