import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import characters from '../data/characters'

export default function Subscription() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { user, refreshSubscriptions } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [processing, setProcessing] = useState(false)

  const c = characters.find(x => x.id === charId)

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
      price: 7.9,
      desc: 'Platform access + chat with this character',
      features: ['Full chat access', 'View public posts', 'Basic interactions']
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 15.9,
      desc: 'Everything in Basic + exclusive content + deeper relationship',
      features: [
        'Everything in Basic',
        'Exclusive locked posts',
        'Deeper relationship levels',
        'Priority response',
        'Special event content'
      ],
      badge: 'POPULAR'
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 29.9,
      desc: 'All access pass — the ultimate experience',
      features: [
        'Everything in Premium',
        'All exclusive content',
        'Soulmate relationship path',
        'Custom content requests',
        'Direct creator tips'
      ],
      badge: 'BEST VALUE'
    }
  ]

  const handleSubscribe = async () => {
    setProcessing(true)

    try {
      // Try backend — if server is offline, simulate success
      try {
        await api.post('/api/subscriptions', {
          characterId: charId,
          plan: selectedPlan,
          price: plans.find(p => p.id === selectedPlan).price
        })
        await refreshSubscriptions()
      } catch {
        // Offline mode — toast
        const evt = new CustomEvent('onlyai:toast', {
          detail: `🎉 Demo: Subscribed to ${c.name} (plan: ${selectedPlan}) — server integration pending`
        })
        window.dispatchEvent(evt)
      }

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

  const characterPrice = c.subs > 1000 ? '5.9' : '7.9'

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="sub-page">
        <h2>🔓 Subscribe to {c.name}</h2>
        <p className="sub-intro">
          Unlock chat, exclusive posts, and build a deeper relationship with {c.name}.
          <br />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            Platform fee: $7.9/mo + Character sub: ${characterPrice}/mo
          </span>
        </p>

        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 20,
          padding: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{c.name}, {c.age}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
          </div>
        </div>

        {plans.map(plan => (
          <div
            key={plan.id}
            className={`sub-plan ${selectedPlan === plan.id ? 'selected' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">
              ${plan.price}<span>/mo</span>
            </div>
            <div className="plan-desc">{plan.desc}</div>
            {plan.badge && (
              <div className="plan-badge">{plan.badge}</div>
            )}
            <div style={{ marginTop: 10 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  padding: '2px 0'
                }}>
                  ✓ {f}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          className="sub-pay-btn"
          onClick={handleSubscribe}
          disabled={processing}
        >
          {processing
            ? 'Processing...'
            : `🔓 Subscribe — $${plans.find(p => p.id === selectedPlan).price}/mo`
          }
        </button>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          lineHeight: 1.6
        }}>
          🔒 Secure payment via Stripe. Cancel anytime.<br />
          By subscribing you agree to our Terms of Service.
        </div>
      </div>
    </div>
  )
}
