import React, { useState, useEffect } from 'react'
import api from '../services/api'

const TIP_PRESETS = [1, 3, 5, 10]

export default function TipModal({ character, onClose }) {
  const [selectedAmount, setSelectedAmount] = useState(5)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Reset when selecting custom
  useEffect(() => {
    if (isCustom) {
      setSelectedAmount(null)
    }
  }, [isCustom])

  const getAmount = () => {
    if (isCustom) return parseFloat(customAmount) || 0
    return selectedAmount || 0
  }

  const handleSend = async () => {
    const amount = getAmount()
    if (amount < 1 || amount > 999) {
      setError('Amount must be between $1 and $999')
      return
    }

    setSending(true)
    setError('')

    try {
      await api.post('/api/tip', {
        characterId: character.id,
        amount,
        message: message.trim() || undefined
      })
      setSuccess(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      const detail = err.response?.data?.error || 'Failed to send tip. Please try again.'
      setError(detail)
    } finally {
      setSending(false)
    }
  }

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="tip-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="tip-close" onClick={onClose}>×</button>

        {success ? (
          <div className="tip-success">
            <div className="tip-success-icon">🎉</div>
            <h3>Tip Sent!</h3>
            <p>${getAmount().toFixed(2)} to {character.name}</p>
            <p className="tip-success-sub">{character.name} appreciates your support 💕</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="tip-header">
              <div className="tip-char-avatar">
                <img src={character.image} alt={character.name} />
              </div>
              <div className="tip-char-info">
                <div className="tip-char-name">Send a Tip to {character.name}</div>
                <div className="tip-char-sub">Show your appreciation 💕</div>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="tip-amounts">
              <div className="tip-amounts-label">Choose amount</div>
              <div className="tip-amount-grid">
                {TIP_PRESETS.map(amt => (
                  <button
                    key={amt}
                    className={`tip-amount-btn ${!isCustom && selectedAmount === amt ? 'active' : ''}`}
                    onClick={() => { setSelectedAmount(amt); setIsCustom(false) }}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  className={`tip-amount-btn custom ${isCustom ? 'active' : ''}`}
                  onClick={() => setIsCustom(true)}
                >
                  {isCustom ? (
                    <input
                      type="number"
                      className="tip-custom-input"
                      placeholder="$"
                      min="1"
                      max="999"
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    'Custom'
                  )}
                </button>
              </div>
            </div>

            {/* Optional Message */}
            <div className="tip-message-area">
              <label className="tip-message-label">Message (optional)</label>
              <textarea
                className="tip-message-input"
                placeholder={`Say something nice to ${character.name}...`}
                maxLength={200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
              <div className="tip-char-count">{message.length}/200</div>
            </div>

            {/* Error */}
            {error && <div className="tip-error">{error}</div>}

            {/* Submit */}
            <button
              className="tip-send-btn"
              onClick={handleSend}
              disabled={sending || getAmount() < 1}
            >
              {sending ? (
                <span className="tip-sending"><span className="spinner-sm"></span> Sending...</span>
              ) : (
                <>💸 Send ${getAmount().toFixed(2)} Tip</>
              )}
            </button>

            <div className="tip-security">
              🔒 Secure payment — 100% goes to {character.name}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
