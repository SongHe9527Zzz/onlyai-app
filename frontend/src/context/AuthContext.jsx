import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('onlyai_token'))
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState([])

  // Restore session on mount
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/api/auth/me')
        .then(res => {
          setUser(res.data.user)
          if (res.data.subscriptions) {
            setSubscriptions(res.data.subscriptions)
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('onlyai_token')
          setToken(null)
          setUser(null)
          delete api.defaults.headers.common['Authorization']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { token: newToken, user: userData, subscriptions: subs } = res.data
    localStorage.setItem('onlyai_token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(userData)
    setSubscriptions(subs || [])
    return userData
  }, [])

  const register = useCallback(async (email, password, username) => {
    const res = await api.post('/api/auth/register', { email, password, username })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('onlyai_token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('onlyai_token')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    setSubscriptions([])
  }, [])

  const isSubscribed = useCallback((characterId) => {
    return subscriptions.some(s => s.character_id === characterId && s.status === 'active')
  }, [subscriptions])

  const refreshSubscriptions = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get('/api/subscriptions')
      setSubscriptions(res.data.subscriptions || [])
    } catch (e) {
      // Offline mode — keep current state
    }
  }, [token])

  const value = {
    user, token, loading,
    subscriptions,
    login, register, logout,
    isSubscribed, refreshSubscriptions,
    setUser, setSubscriptions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
