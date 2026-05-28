import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import characters from '../data/characters'

export default function Subscription() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, refreshSubscriptions } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [processing, setProcessing] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState(null) // null | 'success' | 'canceled'

  const c = characters.find(x => x.id === charId)

  // Check if returning from Stripe Checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const canceled = searchParams.get('canceled')
    const planFromUrl = searchParams.get('plan')
    const checkoutComplete = searchParams.get('checkout')

    if (sessionId || checkoutComplete) {
      setCheckoutStatus('success')
      // Refresh subscriptions to update UI
      refreshSubscriptions()
      // Wait a moment then redirect to chat
      setTimeout(() => {
        if (planFromUrl) {
          navigate(`/chat/${charId}?plan=${planFromUrl}`)
        } else {
          navigate(`/chat/${charId}`)
        }
      }, 2000)
    } else if (canceled) {
      setCheckoutStatus('canceled')
    }
  }, [searchParams, charId, navigate, refreshSubscriptions])

  if (!c) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Character not found
      </div>
    )
  }

  const plans = [
    {
      id: 'standard',
      name: 'Basic',
      price: 7.99,
      desc: 'Unlock chat + public posts with this character',
      features: ['Full chat access', 'View public posts', 'Basic interactions'],
      color: 'rgba(255,255,255,0.3)'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 15.99,
      desc: 'Everything in Basic + exclusive locked content + deeper relationship',
      features: [
        'Everything in Basic',
        'Exclusive locked posts',
        'Deeper relationship levels',
        'Priority response',
        'Special event content'
      ],
      badge: 'POPULAR',
      color: '#ff6b9d'
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 29.99,
      desc: 'All-access pass — the ultimate experience',
      features: [
        'Everything in Premium',
        'All exclusive content',
        'Soulmate relationship path',
        'Custom content requests',
        'Direct creator tips'
      ],
      badge: 'BEST VALUE',
      color: '#c44dff'
    }
  ]

  const selectedPlanData = plans.find(p => p.id === selectedPlan) || plans[1]

  const handleSubscribe = async () => {
    setProcessing(true)
    try {
      const plan = selectedPlan || 'premium'

      // Try Stripe Checkout via backend
      try {
        const res = await api.post('/api/payments/create-checkout-session', {
          characterId: charId,
          plan,
          successUrl: `${window.location.origin}/subscribe/${charId}`,
          cancelUrl: `${window.location.origin}/subscribe/${charId}?canceled=true`
        })

        // If we got a URL, redirect to Stripe
        if (res.data.url) {
          window.location.href = res.data.url
          return // Navigation will happen, don't continue
        }
      } catch (apiErr) {
        console.log('[Subscription] API call failed, falling back to dev mode:', apiErr.message)
      }

      // Dev/fallback mode — create subscription directly
      await api.post('/api/subscriptions', {
        characterId: charId,
        plan,
        price: selectedPlanData.price
      })
      await refreshSubscriptions()
      const evt = new CustomEvent('onlyai:toast', {
        detail: `🎉 Demo: Subscribed to ${c.name} (${selectedPlan})`
      })
      window.dispatchEvent(evt)
      navigate(`/chat/${charId}`)
    } catch (err) {
      const evt = new CustomEvent('onlyai:toast', {
        detail: '❌ Subscription failed. Please try again.'
      })
      window.dispatchEvent(evt)
    } finally {
      setProcessing(false)
    }
  }

  // ─── Success / Canceled states ─────────────────────────
  if (checkoutStatus === 'success') {
    return (
      <div className="page-content" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 40, minHeight: '60vh'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ marginBottom: 8 }}>Subscription Activated!</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 16 }}>
          You're now subscribed to {c.name}.<br />
          Redirecting to chat...
        </p>
        <div className="spinner"></div>
      </div>
    )
  }

  if (checkoutStatus === 'canceled') {
    return (
      <div className="page-content" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 40, minHeight: '60vh'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🤔</div>
        <h2 style={{ marginBottom: 8 }}>Checkout Canceled</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20 }}>
          No worries! You can subscribe anytime.
        </p>
        <button className="sub-pay-btn" onClick={() => setCheckoutStatus(null)}>
          🔄 Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="sub-page">
        <h2>🔓 Subscribe to {c.name}</h2>
        <p className="sub-intro">
          Unlock chat, exclusive posts, and build a deeper relationship with {c.name}.
        </p>

        {/* Character Info Card */}
        <div className="sub-char-card">
          <div className="sub-char-avatar">
            <img src={c.image} alt={c.name} />
          </div>
          <div className="sub-char-info">
            <div className="sub-char-name">{c.name}, {c.age}</div>
            <div className="sub-char-tagline">{c.tagline}</div>
          </div>
        </div>

        {/* Plan Selection */}
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`sub-plan ${selectedPlan === plan.id ? 'selected' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
            style={selectedPlan === plan.id ? {
              borderColor: plan.color,
              background: `${plan.color}10`
            } : {}}
          >
            <div className="plan-row">
              <div>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">{plan.desc}</div>
              </div>
              <div className="plan-price" style={{ color: plan.color }}>
                ${plan.price}<span>/mo</span>
              </div>
            </div>
            {plan.badge && (
              <div className="plan-badge" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}88)` }}>
                {plan.badge}
              </div>
            )}
            <div className="plan-features">
              {plan.features.map((f, i) => (
                <div key={i} className="plan-feature">
                  ✓ {f}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Subscribe Button */}
        <button
          className="sub-pay-btn"
          onClick={handleSubscribe}
          disabled={processing}
          style={{
            background: processing
              ? 'rgba(255,255,255,0.1)'
              : `linear-gradient(135deg, ${selectedPlanData.color || '#ff6b9d'}, ${selectedPlanData.color || '#c44dff'})`
          }}
        >
          {processing
            ? '⏳ Processing...'
            : `🔓 Subscribe — $${selectedPlanData.price}/mo`
          }
        </button>

        {/* Security Info */}
        <div className="sub-security">
          🔒 Secure payment processed by Stripe. Cancel anytime.<br />
          By subscribing you agree to our Terms of Service.
        </div>
      </div>
    </div>
  )
}
