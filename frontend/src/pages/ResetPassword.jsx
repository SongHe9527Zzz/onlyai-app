import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirm) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/account/reset-password', { email, token, password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="page-content">
        <div className="auth-page">
          <div className="auth-logo">
            Only<span>AI</span>
          </div>
          <div className="auth-subtitle" style={{ marginBottom: 24 }}>
            Invalid or missing reset link.
          </div>
          <div style={{
            padding: 20,
            background: 'rgba(255, 77, 77, 0.06)',
            border: '1px solid rgba(255, 77, 77, 0.15)',
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
              This reset link is invalid or has expired. Please request a new one.
            </div>
          </div>
          <div className="auth-link">
            <Link to="/forgot-password">Request New Reset Link</Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="page-content">
        <div className="auth-page">
          <div className="auth-logo">
            Only<span>AI</span>
          </div>
          <div style={{
            padding: 20,
            background: 'rgba(74, 222, 128, 0.06)',
            border: '1px solid rgba(74, 222, 128, 0.15)',
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Password Reset Successfully!
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              You can now sign in with your new password.
            </div>
          </div>
          <button
            className="auth-submit"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
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
          Create a new password for your account.
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              style={{ opacity: 0.5 }}
            />
          </div>

          <div className="field">
            <label>New Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {error && <div className="field"><div className="error-msg">{error}</div></div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-link">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
