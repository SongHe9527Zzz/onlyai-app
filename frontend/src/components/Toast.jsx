import React, { useEffect } from 'react'

export default function Toast() {
  const [message, setMessage] = React.useState('')
  const [visible, setVisible] = React.useState(false)

  useEffect(() => {
    const handler = (e) => {
      setMessage(e.detail || e.detail?.message || '')
      setVisible(true)
      setTimeout(() => setVisible(false), 2500)
    }
    window.addEventListener('onlyai:toast', handler)
    return () => window.removeEventListener('onlyai:toast', handler)
  }, [])

  return (
    <div id="toast" className={`toast ${visible ? 'show' : ''}`}>
      {message}
    </div>
  )
}

export function showToast(msg) {
  window.dispatchEvent(new CustomEvent('onlyai:toast', { detail: msg }))
}
