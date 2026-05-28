import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { showToast } from '../components/Toast'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' }
]

export default function Settings() {
  const navigate = useNavigate()

  const [settings, setSettings] = useState({
    language: 'en',
    email_notifications: true,
    push_enabled: true,
    privacy_show_online: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/account/settings')
      setSettings(res.data.settings)
    } catch {
      // Keep defaults
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSaving(true)
    try {
      await api.put('/api/account/settings', { [key]: value })
      showToast('✅ Setting updated')
    } catch {
      setSettings(settings) // revert
      showToast('❌ Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const handleLanguageSelect = async (code) => {
    setShowLanguagePicker(false)
    setSettings(prev => ({ ...prev, language: code }))
    setSaving(true)
    try {
      await api.put('/api/account/settings', { language: code })
      showToast(`🌐 Language changed to ${LANGUAGES.find(l => l.code === code)?.label}`)
    } catch {
      showToast('❌ Failed to update language')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  const currentLang = LANGUAGES.find(l => l.code === settings.language) || LANGUAGES[0]

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back" onClick={() => navigate(-1)}>←</button>
          <h2>Settings</h2>
          <div style={{ width: 40 }}></div>
        </div>

        {/* Language */}
        <div className="settings-section">
          <h3 className="settings-section-title">🌐 Language</h3>
          <div className="settings-card" onClick={() => setShowLanguagePicker(!showLanguagePicker)}>
            <div className="settings-row">
              <span className="settings-row-label">App Language</span>
              <span className="settings-row-value">
                {currentLang.flag} {currentLang.label} <span style={{ opacity: 0.3 }}>▸</span>
              </span>
            </div>
          </div>
          {showLanguagePicker && (
            <div className="language-picker">
              {LANGUAGES.map(lang => (
                <div
                  key={lang.code}
                  className={`language-option ${lang.code === settings.language ? 'selected' : ''}`}
                  onClick={() => handleLanguageSelect(lang.code)}
                >
                  <span className="lang-flag">{lang.flag}</span>
                  <span className="lang-name">{lang.label}</span>
                  {lang.code === settings.language && <span className="lang-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔔 Notifications</h3>
          <div className="settings-card">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-row-label">Email Notifications</div>
                <div className="settings-row-desc">Receive updates and promotions via email</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={e => updateSetting('email_notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-row-label">Push Notifications</div>
                <div className="settings-row-desc">Receive push notifications for messages and updates</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.push_enabled}
                  onChange={e => updateSetting('push_enabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔒 Privacy</h3>
          <div className="settings-card">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-row-label">Show Online Status</div>
                <div className="settings-row-desc">Let others see when you're online</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.privacy_show_online}
                  onChange={e => updateSetting('privacy_show_online', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="settings-section">
          <h3 className="settings-section-title">💬 Support</h3>
          <div className="settings-card" onClick={() => showToast('✉️ Contact: support@onlyai.app')}>
            <div className="settings-row">
              <span className="settings-row-label">Contact Us</span>
              <span className="settings-row-value" style={{ fontSize: 12 }}>support@onlyai.app ▸</span>
            </div>
          </div>
          <div className="settings-card" onClick={() => showToast('📖 Help center coming soon')}>
            <div className="settings-row">
              <span className="settings-row-label">Help Center</span>
              <span className="settings-row-value" style={{ opacity: 0.3 }}>▸</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <h3 className="settings-section-title">ℹ️ About</h3>
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-row-label">Version</span>
              <span className="settings-row-value" style={{ fontSize: 12, opacity: 0.5 }}>1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
