import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import characters from '../data/characters'

export default function ManageSubscription() {
  const navigate = useNavigate()
  const { subscriptions, refreshSubscriptions } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [upgradeModal, setUpgradeModal] = useState(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const res = await api.get('/api/payments/invoices')
      setInvoices(res.data.invoices || [])
    } catch {
      // Dev mode — no invoices
    } finally {
      setLoading(false)
    }
  }

  const getCharacter = (charId) => characters.find(c => c.id === charId)

  const getPlanPrice = (plan) => {
    const prices = { standard: 7.99, premium: 15.99, vip: 29.99 }
    return prices[plan] || 15.99
  }

  const getPlanColor = (plan) => {
    const colors = { standard: 'rgba(255,255,255,0.3)', premium: '#ff6b9d', vip: '#c44dff' }
    return colors[plan] || colors.premium
  }

  // Cancel a subscription
  const handleCancel = async (sub) => {
    if (!window.confirm(`Are you sure you want to cancel your subscription to ${getCharacter(sub.character_id)?.name || sub.character_id}?`)) {
      return
    }

    setActionLoading(sub.id)
    try {
      if (sub.stripe_subscription_id) {
        await api.post('/api/payments/cancel-subscription', {
          subscriptionId: sub.stripe_subscription_id
        })
      } else {
        await api.delete(`/api/subscriptions/${sub.id}`)
      }
      await refreshSubscriptions()
      showToast('✅ Subscription cancelled')
    } catch {
      showToast('❌ Failed to cancel subscription')
    } finally {
      setActionLoading(null)
    }
  }

  // Upgrade/downgrade a plan
  const handleUpgrade = async (sub, newPlan) => {
    setActionLoading(`${sub.id}-${newPlan}`)
    try {
      if (sub.stripe_subscription_id) {
        await api.post('/api/payments/update-subscription', {
          subscriptionId: sub.stripe_subscription_id,
          newPlan
        })
      } else {
        // Dev mode — update locally
        await api.delete(`/api/subscriptions/${sub.id}`)
        await api.post('/api/subscriptions', {
          characterId: sub.character_id,
          plan: newPlan,
          price: getPlanPrice(newPlan)
        })
      }
      await refreshSubscriptions()
      setUpgradeModal(null)
      showToast(`✅ Plan upgraded to ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}`)
    } catch {
      showToast('❌ Failed to update plan')
    } finally {
      setActionLoading(null)
    }
  }

  const showToast = (msg) => {
    const evt = new CustomEvent('onlyai:toast', { detail: msg })
    window.dispatchEvent(evt)
  }

  // Group active and cancelled subscriptions
  const activeSubs = subscriptions.filter(s => s.status === 'active')
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled')

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="manage-sub-page">
        <h2>📋 My Subscriptions</h2>
        <p className="sub-intro" style={{ marginBottom: 24 }}>
          Manage your character subscriptions, upgrade plans, and view payment history.
        </p>

        {activeSubs.length === 0 && cancelledSubs.length === 0 && (
          <div className="empty-subs">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔓</div>
            <h3>No subscriptions yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20, marginTop: 4 }}>
              Subscribe to a character to start chatting and unlock exclusive content!
            </p>
            <button className="sub-pay-btn" onClick={() => navigate('/explore')}>
              🔍 Browse Characters
            </button>
          </div>
        )}

        {/* Active Subscriptions */}
        {activeSubs.length > 0 && (
          <>
            <h3 className="section-title">✨ Active</h3>
            {activeSubs.map(sub => {
              const char = getCharacter(sub.character_id)
              return (
                <div key={sub.id} className="manage-card">
                  <div className="manage-card-header">
                    <div className="manage-char-info">
                      {char && (
                        <div className="manage-avatar">
                          <img src={char.image} alt={char.name} />
                        </div>
                      )}
                      <div>
                        <div className="manage-char-name">
                          {char?.name || sub.character_id}
                        </div>
                        <div className="manage-plan-badge" style={{ color: getPlanColor(sub.plan) }}>
                          {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="manage-price">
                      ${getPlanPrice(sub.plan)}<span>/mo</span>
                    </div>
                  </div>

                  <div className="manage-card-actions">
                    <button
                      className="manage-btn upgrade"
                      onClick={() => setUpgradeModal(sub)}
                      disabled={actionLoading === sub.id}
                    >
                      {actionLoading === sub.id ? '...' : '🔄 Change Plan'}
                    </button>
                    <button
                      className="manage-btn cancel"
                      onClick={() => handleCancel(sub)}
                      disabled={actionLoading === sub.id}
                    >
                      {actionLoading === sub.id ? '...' : '🚫 Cancel'}
                    </button>
                    <button
                      className="manage-btn chat"
                      onClick={() => navigate(`/chat/${sub.character_id}`)}
                    >
                      💬 Chat
                    </button>
                  </div>

                  {/* Upgrade Modal inline */}
                  {upgradeModal && upgradeModal.id === sub.id && (
                    <div className="upgrade-inline">
                      <div className="upgrade-title">Change plan for {char?.name || sub.character_id}</div>
                      <div className="upgrade-options">
                        {['standard', 'premium', 'vip'].map(plan => (
                          <div
                            key={plan}
                            className={`upgrade-option ${plan === sub.plan ? 'current' : ''}`}
                            onClick={() => plan !== sub.plan && handleUpgrade(sub, plan)}
                          >
                            <div className="uo-name">
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                              {plan === sub.plan && <span className="uo-current"> · Current</span>}
                            </div>
                            <div className="uo-price">${getPlanPrice(plan)}/mo</div>
                            {plan !== sub.plan && (
                              <div className="uo-action">
                                {actionLoading === `${sub.id}-${plan}` ? '...' : 'Switch →'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        className="manage-btn cancel-upgrade"
                        onClick={() => setUpgradeModal(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {sub.stripe_subscription_id && (
                    <div className="manage-meta">
                      Stripe ID: {sub.stripe_subscription_id?.substring(0, 14)}...
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Cancelled Subscriptions */}
        {cancelledSubs.length > 0 && (
          <>
            <h3 className="section-title" style={{ marginTop: 28 }}>📦 Cancelled</h3>
            {cancelledSubs.map(sub => {
              const char = getCharacter(sub.character_id)
              return (
                <div key={sub.id} className="manage-card cancelled">
                  <div className="manage-card-header">
                    <div className="manage-char-info">
                      {char && (
                        <div className="manage-avatar">
                          <img src={char.image} alt={char.name} />
                        </div>
                      )}
                      <div>
                        <div className="manage-char-name">
                          {char?.name || sub.character_id}
                        </div>
                        <div className="manage-plan-badge" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          Cancelled
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                    You can re-subscribe anytime
                  </div>
                  <button
                    className="manage-btn resub"
                    onClick={() => navigate(`/subscribe/${sub.character_id}`)}
                    style={{ marginTop: 8 }}
                  >
                    🔄 Resubscribe
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* Invoice History */}
        {invoices.length > 0 && (
          <>
            <h3 className="section-title" style={{ marginTop: 28 }}>🧾 Payment History</h3>
            <div className="invoices-list">
              {invoices.map(inv => (
                <div key={inv.id} className="invoice-item">
                  <div className="inv-info">
                    <div className="inv-date">
                      {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="inv-status" style={{
                      color: inv.status === 'paid' ? '#4ade80' : '#ff4d4d'
                    }}>
                      {inv.status === 'paid' ? 'Paid' : 'Failed'}
                    </div>
                  </div>
                  <div className="inv-amount">
                    ${(inv.amountPaid / 100).toFixed(2)}
                  </div>
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inv-pdf"
                    >
                      📄
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="manage-info-box">
          <h4>💡 About Subscriptions</h4>
          <ul>
            <li>Billed monthly — cancel anytime</li>
            <li>Premium unlocks exclusive posts and deeper relationship levels</li>
            <li>VIP gives you all-access with custom content requests</li>
            <li>Your conversations and relationship level are preserved if you resubscribe</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
