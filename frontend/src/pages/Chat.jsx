import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  connectSocket,
  disconnectSocket,
  sendChatMessage,
  onChatReply,
  onTyping,
  sendTyping,
  joinConversation,
  leaveConversation
} from '../services/websocket'
import characters from '../data/characters'

export default function Chat() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { user, token, isSubscribed } = useAuth()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [mockMode, setMockMode] = useState(false)

  const msgsEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const c = characters.find(x => x.id === charId)

  // Connect WebSocket on mount
  useEffect(() => {
    if (!c) return

    // Initialize with system message
    setMessages([
      { role: 'system', content: `── Connected to ${c.name} ──` },
      { role: 'assistant', content: c.chatFirst }
    ])

    if (!token) {
      setMockMode(true)
      return
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
      // Fall back to mock mode if server unavailable
      setMockMode(true)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)

    // If already connected
    if (socket.connected) {
      handleConnect()
    }

    return () => {
      leaveConversation(charId)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
    }
  }, [charId, token, c])

  // Listen for AI replies
  useEffect(() => {
    if (!token || mockMode) return

    const cleanup = onChatReply((data) => {
      if (data.characterId === charId) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        setIsTyping(false)
      }
    })

    return cleanup
  }, [charId, token, mockMode])

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

  const handleSend = useCallback(() => {
    const txt = input.trim()
    if (!txt || !c) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: txt }])
    setInput('')

    if (mockMode || !connected) {
      // Mock reply
      setIsTyping(true)
      setTimeout(() => {
        const reply = c.replies[Math.floor(Math.random() * c.replies.length)]
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        setIsTyping(false)
      }, 800 + Math.random() * 600)
    } else {
      // Send via WebSocket
      sendChatMessage(charId, txt)
    }
  }, [input, c, mockMode, connected, charId])

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

      <div className="chat-msgs" style={{ paddingBottom: 80 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            {msg.content}
          </div>
        ))}
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
          placeholder={`Message ${c.name}...`}
          disabled={!mockMode && !connected && !isSubscribed(charId)}
        />
        <button onClick={handleSend} disabled={!input.trim()}>
          ➤
        </button>
      </div>
    </div>
  )
}
