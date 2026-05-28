import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, login, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password')
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Connection error. Server may be offline.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      <div className="auth-page">
        <div className="auth-logo">
          Only<span>AI</span>
        </div>
        <div className="auth-subtitle">
          Meet your AI companions. Subscribe. Chat. Connect.
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

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="field"><div className="error-msg">{error}</div></div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-link">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <div className="auth-link">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Demo Access
          </div>
          <button
            onClick={async () => {
              try {
                await login('demo@onlyai.app', 'demo123456')
                navigate('/', { replace: true })
              } catch {
                setError('Demo server unavailable. Try registering.')
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '10px 24px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            🚀 Quick Demo (guest)
          </button>
        </div>
      </div>
    </div>
  )
}
