import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { showToast } from '../components/Toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState('')
  const [devToken, setDevToken] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/api/account/forgot-password', { email })
      setSent(true)
      // Dev mode: show the reset link
      if (res.data._devResetUrl) {
        setDevResetUrl(res.data._devResetUrl)
        setDevToken(res.data._devToken || '')
      }
      showToast('✅ Reset link sent!')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="page-content">
        <div className="auth-page">
          <div className="auth-logo">
            Only<span>AI</span>
          </div>
          <div className="auth-subtitle">
            Reset link sent! Check your email inbox.
          </div>

          <div className="auth-form">
            <div style={{
              padding: 20,
              background: 'rgba(74, 222, 128, 0.06)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
              borderRadius: 12,
              textAlign: 'center',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                We've sent a password reset link to:
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
                {email}
              </div>
            </div>

            {/* Dev-only: show reset link */}
            {devResetUrl && (
              <div style={{
                padding: 16,
                background: 'rgba(255, 107, 157, 0.06)',
                border: '1px solid rgba(255, 107, 157, 0.1)',
                borderRadius: 12,
                marginBottom: 16,
                wordBreak: 'break-all',
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.6)' }}>
                  🔧 Development Mode — Reset Link
                </div>
                <a href={devResetUrl} style={{ color: '#ff6b9d' }}>{devResetUrl}</a>
              </div>
            )}

            <div className="auth-link">
              <Link to="/login">Back to Sign In</Link>
            </div>
            <div className="auth-link" style={{ marginTop: 8 }}>
              Didn't receive it? <button
                onClick={() => { setSent(false); setDevResetUrl(''); setDevToken('') }}
                style={{ background: 'none', border: 'none', color: '#ff6b9d', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >Try again</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="auth-page">
        <div className="auth-logo">
          Only<span>AI</span>
        </div>
        <div className="auth-subtitle">
          Enter your email and we'll send you a link to reset your password.
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          {error && <div className="field"><div className="error-msg">{error}</div></div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-link">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
