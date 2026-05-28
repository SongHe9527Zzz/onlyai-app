import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { showToast } from '../components/Toast'

const NOTIF_ICONS = {
  system: '🔧',
  subscription: '⭐',
  message: '💬',
  promotion: '🎉',
  default: '📬'
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/api/account/notifications')
      setNotifications(res.data.notifications)
      setUnreadCount(res.data.unread_count)
      setTotal(res.data.total)
    } catch {
      // No notifications yet
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    setActionLoading(true)
    try {
      await api.put('/api/account/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      showToast('✅ All marked as read')
    } catch {
      showToast('❌ Failed to mark as read')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/account/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }

  const handleSeedNotifications = async () => {
    try {
      await api.post('/api/account/notifications/seed')
      await loadNotifications()
      showToast('📬 Sample notifications added!')
    } catch {
      showToast('❌ Failed to add sample notifications')
    }
  }

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back" onClick={() => navigate(-1)}>←</button>
          <h2>Notifications</h2>
          {unreadCount > 0 && (
            <button
              className="settings-header-action"
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              style={{ fontSize: 12, color: '#ff6b9d', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              Mark all read
            </button>
          )}
          {unreadCount === 0 && <div style={{ width: 80 }}></div>}
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>No notifications yet</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              You'll see notifications about messages, subscriptions, and system updates here.
            </p>
            <button
              className="auth-submit"
              style={{ fontSize: 13, padding: '10px 20px', width: 'auto' }}
              onClick={handleSeedNotifications}
            >
              📬 Load Sample Notifications
            </button>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="notif-summary">
              <span>{total} notifications{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}</span>
              {total === 0 && notifications.length > 0 && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  (loaded from sample data)
                </span>
              )}
            </div>

            {/* Notification list */}
            <div className="notif-list">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                >
                  <div className="notif-icon">
                    {NOTIF_ICONS[notif.type] || NOTIF_ICONS.default}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-body">{notif.body}</div>
                    <div className="notif-time">{getTimeAgo(notif.created_at)}</div>
                  </div>
                  {!notif.read && <div className="notif-dot"></div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state hint */}

        <div className="manage-info-box" style={{ marginTop: 24 }}>
          <h4>🔔 About Notifications</h4>
          <ul>
            <li>Messages from your subscribed characters appear here</li>
            <li>Subscription renewals and expirations are notified</li>
            <li>System announcements about new features</li>
            <li>Manage notification preferences in Settings</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
