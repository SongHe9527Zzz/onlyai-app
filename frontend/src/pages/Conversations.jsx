import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../services/websocket'
import characters from '../data/characters'
import api from '../services/api'

export default function Conversations() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchConversations = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await api.get('/api/conversations')
      const convs = res.data.conversations || []

      // Enrich with character data
      const enriched = convs.map(c => {
        const ch = characters.find(x => x.id === c.character_id)
        return {
          ...c,
          character_name: ch?.name || c.character_name,
          character_tagline: ch?.tagline || c.character_tagline || ch?.desc || '',
          image: ch?.image || ''
        }
      })

      setConversations(enriched)
    } catch (err) {
      console.error('[Conversations] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Listen for WebSocket updates to refresh conversation list
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleConvUpdate = () => {
      fetchConversations()
    }

    socket.on('conv:updated', handleConvUpdate)
    socket.on('chat:reply', handleConvUpdate)

    return () => {
      socket.off('conv:updated', handleConvUpdate)
      socket.off('chat:reply', handleConvUpdate)
    }
  }, [fetchConversations])

  const handleDelete = async (convId) => {
    try {
      await api.delete(`/api/conversations/${convId}`)
      setConversations(prev => prev.filter(c => c.id !== convId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('[Conversations] Delete error:', err)
    }
  }

  const handleOpenChat = (charId) => {
    navigate(`/chat/${charId}`)
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncate = (text, maxLen = 60) => {
    if (!text) return ''
    if (text.length <= maxLen) return text
    return text.substring(0, maxLen) + '...'
  }

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>💬 Messages</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Your conversations with characters
        </p>
      </div>

      {conversations.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💭</div>
          <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>No conversations yet</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Start chatting with a character to see your messages here
          </p>
          <button
            className="subscribe-btn"
            style={{ maxWidth: 200, margin: '0 auto', fontSize: 14 }}
            onClick={() => navigate('/explore')}
          >
            🔍 Explore Characters
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 8px' }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              className="conv-card"
              onClick={() => handleOpenChat(conv.character_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 8px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.2s',
                position: 'relative',
                borderRadius: 8
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative'
              }}>
                {conv.image ? (
                  <img src={conv.image} alt={conv.character_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #ff6b9d, #c44dff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700
                  }}>
                    {conv.character_name?.charAt(0) || '?'}
                  </div>
                )}
                {/* Unread badge */}
                {conv.unread_count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#ff6b9d',
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    padding: '0 4px',
                    border: '2px solid #0a0a0f'
                  }}>
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 3
                }}>
                  <span style={{
                    fontWeight: conv.unread_count > 0 ? 700 : 500,
                    fontSize: 14,
                    color: conv.unread_count > 0 ? '#fff' : 'rgba(255,255,255,0.7)'
                  }}>
                    {conv.character_name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.3)',
                    flexShrink: 0
                  }}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div style={{
                  fontSize: 13,
                  color: conv.unread_count > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {conv.last_message_role === 'user' && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>You: </span>
                  )}
                  {truncate(conv.last_message || 'No messages yet')}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm(deleteConfirm === conv.id ? null : conv.id)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,77,77,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
              >
                ⋯
              </button>

              {/* Delete confirmation */}
              {deleteConfirm === conv.id && (
                <div style={{
                  position: 'absolute',
                  right: 36,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,77,77,0.1)',
                  border: '1px solid rgba(255,77,77,0.2)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  zIndex: 20
                }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                    Delete chat?
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(conv.id)
                    }}
                    style={{
                      background: 'rgba(255,77,77,0.2)',
                      border: '1px solid rgba(255,77,77,0.3)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#ff6b6b',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(null)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ margin: '16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }} />

      {/* Tips section */}
      <div style={{
        padding: '0 16px',
        fontSize: 12,
        color: 'rgba(255,255,255,0.2)',
        lineHeight: 1.6
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
          💡 Tips
        </div>
        <div>• Tap a conversation to continue chatting</div>
        <div>• Hold the ⋯ button to delete a conversation</div>
        <div>• 💎 Marked messages are paid private content</div>
      </div>
    </div>
  )
}
