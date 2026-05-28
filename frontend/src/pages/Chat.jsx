import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Paywall, { FreeChatLimitBanner } from '../components/Paywall'
import {
  connectSocket,
  disconnectSocket,
  sendChatMessage,
  onChatReply,
  onTyping,
  sendTyping,
  joinConversation,
  leaveConversation,
  getSocket
} from '../services/websocket'
import api from '../services/api'
import characters from '../data/characters'

// Maximum number of free messages before paywall kicks in
const FREE_CHAT_LIMIT = 5

export default function Chat() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { user, token, isSubscribed } = useAuth()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [mockMode, setMockMode] = useState(false)
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [chatBlocked, setChatBlocked] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [unlockingMsgId, setUnlockingMsgId] = useState(null)
  const [unlockError, setUnlockError] = useState(null)

  const msgsEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const c = characters.find(x => x.id === charId)
  const subscribed = isSubscribed(charId)
  const freeRemaining = subscribed ? null : Math.max(0, FREE_CHAT_LIMIT - freeMessagesUsed)

  // Load message history from REST API
  const loadMessageHistory = useCallback(async () => {
    if (!token || !charId) return

    try {
      const res = await api.get(`/api/messages/${charId}`)
      const historyMessages = res.data.messages || []

      if (historyMessages.length > 0) {
        const formatted = historyMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          is_paid: m.is_paid || false,
          paid_price: m.paid_price || 0,
          is_locked: m.is_locked || false,
          is_unlocked: m.is_unlocked || false,
          read_at: m.read_at,
          created_at: m.created_at
        }))

        setMessages(prev => {
          // Merge: keep existing system messages, append history
          const systemMsgs = prev.filter(m => m.role === 'system')
          // Check for duplicates by id
          const existingIds = new Set(prev.filter(m => m.id).map(m => m.id))
          const newMsgs = formatted.filter(m => !existingIds.has(m.id))
          return [...systemMsgs, ...newMsgs]
        })

        // Track free messages from history
        const userMsgCount = historyMessages.filter(m => m.role === 'user').length
        setFreeMessagesUsed(userMsgCount)

        // If over limit, block
        if (!subscribed && userMsgCount >= FREE_CHAT_LIMIT) {
          setChatBlocked(true)
          setShowPaywall(true)
        }
      }

      // Auto-mark read
      try {
        await api.patch(`/api/messages/read/${charId}`)
      } catch (e) { /* non-critical */ }
    } catch (err) {
      console.error('[Chat] Load history error:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [token, charId, subscribed])

  // Connect WebSocket on mount
  useEffect(() => {
    if (!c || !token) return

    // Initialize with system message
    const initMsgs = [
      { role: 'system', content: `── Connected to ${c.name} ──` },
      { role: 'assistant', content: c.chatFirst }
    ]
    setMessages(initMsgs)

    if (!subscribed) {
      setMockMode(true)
    }

    const socket = connectSocket(token)

    const handleConnect = () => {
      setConnected(true)
      setMockMode(false)
      joinConversation(charId)
    }

    const handleDisconnect = () => {
      setConnected(false)
    }

    const handleError = () => {
      setMockMode(true)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)

    if (socket.connected) {
      handleConnect()
    }

    // Load history
    loadMessageHistory()

    return () => {
      leaveConversation(charId)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
    }
  }, [charId, token, c, subscribed])

  // Listen for AI replies
  useEffect(() => {
    if (!token || mockMode) return

    const cleanup = onChatReply((data) => {
      if (data.characterId === charId) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, read_at: null }])
        setIsTyping(false)
      }
    })

    return cleanup
  }, [charId, token, mockMode])

  // Listen for paid message notifications
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handlePaidMsg = (data) => {
      if (data.characterId === charId) {
        setMessages(prev => [
          ...prev,
          {
            id: data.messageId,
            role: 'assistant',
            content: '',
            is_paid: true,
            paid_price: data.paidPrice,
            is_locked: true,
            is_unlocked: false,
            read_at: null
          }
        ])
      }
    }

    socket.on('chat:paid_msg_received', handlePaidMsg)
    return () => socket.off('chat:paid_msg_received', handlePaidMsg)
  }, [charId])

  // Listen for typing indicator
  useEffect(() => {
    if (!token || mockMode) return

    const cleanup = onTyping((data) => {
      if (data.characterId === charId && data.isTyping) {
        setIsTyping(true)
      } else {
        setIsTyping(false)
      }
    })

    return cleanup
  }, [charId, token, mockMode])

  // Auto-scroll to bottom
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Handle unlock paid message
  const handleUnlock = async (msgId) => {
    setUnlockingMsgId(msgId)
    setUnlockError(null)

    try {
      const res = await api.post(`/api/messages/unlock/${msgId}`)
      if (res.data.success && res.data.content) {
        // Update message in state
        setMessages(prev => prev.map(m => {
          if (m.id === msgId) {
            return {
              ...m,
              content: res.data.content,
              is_locked: false,
              is_unlocked: true
            }
          }
          return m
        }))
      } else if (res.data.requires_payment) {
        // Real payment flow - redirect to Stripe
        setUnlockError('💳 Payment required. Stripe integration needed.')
      }
    } catch (err) {
      console.error('[Chat] Unlock error:', err)
      setUnlockError(err.response?.data?.error || 'Failed to unlock message')
    } finally {
      setUnlockingMsgId(null)
    }
  }

  const handleSend = useCallback(() => {
    const txt = input.trim()
    if (!txt || !c) return

    // Check paywall — if not subscribed and over free limit, block
    if (!subscribed && freeMessagesUsed >= FREE_CHAT_LIMIT) {
      setShowPaywall(true)
      setChatBlocked(true)
      return
    }

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: txt }])
    setInput('')

    // Track free messages
    if (!subscribed) {
      setFreeMessagesUsed(prev => prev + 1)
    }

    if (mockMode || !connected) {
      // Mock reply
      setIsTyping(true)
      setTimeout(() => {
        const reply = c.replies[Math.floor(Math.random() * c.replies.length)]
        setMessages(prev => [...prev, { role: 'assistant', content: reply, read_at: null }])
        setIsTyping(false)
      }, 800 + Math.random() * 600)
    } else {
      sendChatMessage(charId, txt)
    }
  }, [input, c, mockMode, connected, charId, subscribed, freeMessagesUsed])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (!mockMode && connected) {
      sendTyping(charId)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatReadTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (!c) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Character not found. <br />
        <button onClick={() => navigate('/explore')} style={{
          background: 'none', border: 'none', color: '#ff6b9d',
          cursor: 'pointer', fontSize: 14, marginTop: 8
        }}>
          Browse characters →
        </button>
      </div>
    )
  }

  // ─── Full paywall screen (when blocked) ──────────────
  if (chatBlocked && showPaywall) {
    return (
      <div className="chat-page">
        <div className="chat-header">
          <button className="chat-back" onClick={() => navigate(`/profile/${charId}`)}>
            ←
          </button>
          <div className="chat-av">
            <img src={c.image} alt={c.name} />
          </div>
          <div>
            <div className="chat-name">{c.name}</div>
            <div className="chat-status" style={{ color: 'rgba(255,255,255,0.3)' }}>● Private</div>
          </div>
        </div>
        <div className="chat-paywall-screen">
          <div className="paywall-content">
            <div className="paywall-icon">💬</div>
            <h3>Free Chat Limit Reached</h3>
            <p>
              You've used all {FREE_CHAT_LIMIT} free messages with {c.name}.
              Subscribe to continue the conversation!
            </p>
            <div className="paywall-plan-info">
              <div>✨ Full chat access</div>
              <div>🔓 Exclusive unlocked posts</div>
              <div>💕 Build a deeper relationship</div>
            </div>
            <button
              className="paywall-subscribe-btn"
              onClick={() => navigate(`/subscribe/${charId}`)}
            >
              🔓 Subscribe — Starting at $7.99/mo
            </button>
            <button
              className="paywall-manage-btn"
              onClick={() => navigate('/explore')}
            >
              ← Browse other characters
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="chat-back" onClick={() => navigate(`/profile/${charId}`)}>
          ←
        </button>
        <div className="chat-av">
          <img src={c.image} alt={c.name} />
        </div>
        <div>
          <div className="chat-name">{c.name}</div>
          <div className="chat-status">
            {connected ? '● Online · replies instantly' : mockMode ? '○ Offline (demo mode)' : '○ Connecting...'}
          </div>
        </div>
      </div>

      {/* Free chat limit banner */}
      {!subscribed && (
        <FreeChatLimitBanner
          remaining={freeRemaining}
          characterId={charId}
        />
      )}

      <div className="chat-msgs" style={{ paddingBottom: 80 }}>
        {loadingMessages ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const isSystem = msg.role === 'system'
            const isPaid = msg.is_paid
            const isLocked = msg.is_locked
            const isUnlocked = msg.is_unlocked
            const readAt = msg.read_at

            return (
              <div key={i} className={`msg ${isUser ? 'user' : isSystem ? 'system' : 'ai'}`}
                style={isPaid ? { background: 'rgba(255, 215, 0, 0.06)', border: '1px solid rgba(255, 215, 0, 0.1)' } : {}}
              >
                {/* Paid message indicator */}
                {isPaid && !isSystem && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                    fontSize: 11,
                    color: '#ffd700'
                  }}>
                    <span>💎</span>
                    <span style={{ fontWeight: 600 }}>Private Message</span>
                    {isLocked && (
                      <span style={{
                        background: 'rgba(255, 215, 0, 0.15)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10
                      }}>
                        ${(msg.paid_price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {/* Message content */}
                {isPaid && isLocked && !isUnlocked ? (
                  <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🔒</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                      This is a paid private message from {c.name}.
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,215,0,0.6)', marginBottom: 10 }}>
                      Unlock to see exclusive content — ${(msg.paid_price / 100).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleUnlock(msg.id)}
                      disabled={unlockingMsgId === msg.id}
                      style={{
                        background: unlockingMsgId === msg.id
                          ? 'rgba(255,215,0,0.1)'
                          : 'linear-gradient(135deg, #ffd700, #ffaa00)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 20px',
                        color: unlockingMsgId === msg.id ? 'rgba(255,255,255,0.3)' : '#1a1a1a',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: unlockingMsgId === msg.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {unlockingMsgId === msg.id ? 'Unlocking...' : `🔓 Unlock $${(msg.paid_price / 100).toFixed(2)}`}
                    </button>
                    {unlockError && (
                      <div style={{
                        fontSize: 11,
                        color: '#ff6b6b',
                        marginTop: 6
                      }}>
                        {unlockError}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>{msg.content}</div>
                    {/* Read status for assistant messages */}
                    {!isUser && !isSystem && !isPaid && (
                      <div style={{
                        fontSize: 10,
                        color: readAt ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255,255,255,0.15)',
                        textAlign: 'right',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 3
                      }}>
                        {readAt ? (
                          <>
                            <span>✓✓</span>
                            <span>Read {formatReadTime(readAt)}</span>
                          </>
                        ) : (
                          <span>✓</span>
                        )}
                      </div>
                    )}
                    {/* Read status for unlocked paid messages */}
                    {isPaid && !isLocked && (
                      <div style={{
                        fontSize: 10,
                        color: 'rgba(255, 215, 0, 0.4)',
                        textAlign: 'right',
                        marginTop: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 3
                      }}>
                        <span>💎 Unlocked</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
        {isTyping && (
          <div className="msg typing">
            {c.name} is typing...
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            chatBlocked
              ? 'Subscribe to continue chatting...'
              : subscribed
                ? `Message ${c.name}...`
                : `Free message (${freeRemaining}/${FREE_CHAT_LIMIT} remaining)`
          }
          disabled={chatBlocked}
        />
        <button onClick={handleSend} disabled={!input.trim() || chatBlocked}>
          ➤
        </button>
      </div>
    </div>
  )
}
