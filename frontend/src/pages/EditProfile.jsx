import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { showToast } from '../components/Toast'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await api.get('/api/account/profile')
      const profile = res.data.user
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setAvatarPreview(profile.avatar_url || '')
    } catch {
      // Fallback to AuthContext user data
      setUsername(user?.username || '')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ Image too large. Max 5MB.')
      return
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      showToast('❌ Please select an image file.')
      return
    }

    setAvatarFile(file)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview('')
    setAvatarFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username.trim()) {
      showToast('❌ Username cannot be empty')
      return
    }

    setSubmitting(true)
    try {
      let avatar_url = avatarPreview

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        try {
          const uploadRes = await api.post('/api/account/upload-avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          avatar_url = uploadRes.data.url
        } catch {
          // If upload endpoint doesn't exist, use base64 as fallback
          avatar_url = avatarPreview
        }
      }

      await api.put('/api/account/profile', {
        username: username.trim(),
        bio: bio.trim(),
        avatar_url
      })

      // Update AuthContext
      if (setUser) {
        setUser(prev => ({
          ...prev,
          username: username.trim()
        }))
      }

      showToast('✅ Profile updated successfully!')
      navigate(-1)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update profile'
      showToast(`❌ ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Generate avatar initials
  const getInitials = (name) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
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
          <h2>Edit Profile</h2>
          <div style={{ width: 40 }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <div className="edit-avatar-section">
            <div className="edit-avatar-container" onClick={() => document.getElementById('avatar-input').click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="edit-avatar-img" />
              ) : (
                <div className="edit-avatar-placeholder" style={{
                  background: 'linear-gradient(135deg, #ff6b9d, #c44dff)'
                }}>
                  {getInitials(username || user?.username)}
                </div>
              )}
              <div className="edit-avatar-overlay">
                <span>📷</span>
              </div>
            </div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <div className="edit-avatar-actions">
              <button type="button" className="edit-avatar-btn" onClick={() => document.getElementById('avatar-input').click()}>
                Change Photo
              </button>
              {avatarPreview && (
                <button type="button" className="edit-avatar-btn edit-avatar-remove" onClick={handleRemoveAvatar}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="settings-section">
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your nickname"
                maxLength={30}
              />
              <div className="field-hint">{username.length}/30 characters</div>
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.5 }}
              />
              <div className="field-hint">Email cannot be changed</div>
            </div>

            <div className="field">
              <label>Bio</label>
              <textarea
                className="settings-textarea"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us a little about yourself..."
                maxLength={200}
                rows={3}
              />
              <div className="field-hint">{bio.length}/200 characters</div>
            </div>
          </div>

          <button
            type="submit"
            className="settings-save-btn"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : '💾 Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
