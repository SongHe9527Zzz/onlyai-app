import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import characters from '../data/characters'

const TYPE_LABELS = {
  subscription: '📋 Subscription',
  tip: '💸 Tip',
  deposit: '💰 Deposit',
  withdrawal: '🏦 Withdrawal'
}

const TYPE_EMOJIS = {
  subscription: '📋',
  tip: '💸',
  deposit: '💰',
  withdrawal: '🏦'
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'subscriptions' | 'tips' | 'wallet'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, tipsRes] = await Promise.allSettled([
        api.get('/api/payments/orders'),
        api.get('/api/tip/sent')
      ])

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data.orders || [])
      }
      if (tipsRes.status === 'fulfilled') {
        setTips(tipsRes.value.data.tips || [])
      }
    } catch {
      // Dev mode — show empty
    } finally {
      setLoading(false)
    }
  }

  const getCharacterName = (charId) => {
    const c = characters.find(x => x.id === charId)
    return c ? c.name : charId
  }

  const getStatusClass = (status) => {
    if (status === 'completed' || status === 'paid') return 'status-success'
    if (status === 'pending') return 'status-pending'
    if (status === 'cancelled' || status === 'failed') return 'status-failed'
    return 'status-default'
  }

  // Merge orders and tips into unified items
  const allItems = []

  // Add payment orders
  orders.forEach(o => {
    allItems.push({
      id: `order-${o.id}`,
      type: o.type || 'subscription',
      typeLabel: TYPE_LABELS[o.type] || '📋 Order',
      characterId: o.character_id,
      amount: parseFloat(o.amount) || 0,
      currency: o.currency || 'usd',
      status: o.status,
      plan: o.plan,
      date: o.created_at,
      paymentMethod: o.payment_method
    })
  })

  // Add tips
  tips.forEach(t => {
    allItems.push({
      id: `tip-${t.id}`,
      type: 'tip',
      typeLabel: '💸 Tip',
      characterId: t.character_id,
      amount: parseFloat(t.amount) || 0,
      currency: t.currency || 'usd',
      status: t.payment_status,
      message: t.message,
      date: t.created_at,
      paymentMethod: t.payment_method
    })
  })

  // Sort by date (newest first)
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Filter by active tab
  const filteredItems = allItems.filter(item => {
    if (activeTab === 'all') return true
    if (activeTab === 'subscriptions') return item.type === 'subscription'
    if (activeTab === 'tips') return item.type === 'tip'
    if (activeTab === 'wallet') return item.type === 'deposit' || item.type === 'withdrawal'
    return true
  })

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const totalSpent = allItems
    .filter(i => i.status === 'completed' || i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)

  if (loading) {
    return (
      <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="orders-page">
        <h2>🧾 My Orders</h2>
        <p className="orders-subtitle">View all your payments, tips, and transactions</p>

        {/* Summary Cards */}
        <div className="orders-summary">
          <div className="summary-card">
            <div className="summary-value">${totalSpent.toFixed(2)}</div>
            <div className="summary-label">Total Spent</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{allItems.length}</div>
            <div className="summary-label">Transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {allItems.filter(i => i.type === 'subscription' && (i.status === 'completed' || i.status === 'paid')).length}
            </div>
            <div className="summary-label">Subscriptions</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {allItems.filter(i => i.type === 'tip' && (i.status === 'completed' || i.status === 'paid')).length}
            </div>
            <div className="summary-label">Tips</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="orders-tabs">
          {[
            { id: 'all', label: 'All' },
            { id: 'subscriptions', label: '📋 Subscriptions' },
            { id: 'tips', label: '💸 Tips' },
            { id: 'wallet', label: '💰 Wallet' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`orders-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order List */}
        {filteredItems.length === 0 ? (
          <div className="orders-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <h3>No orders yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
              Your payment history will appear here
            </p>
          </div>
        ) : (
          <div className="orders-list">
            {filteredItems.map(item => (
              <div key={item.id} className="order-card">
                <div className="order-card-left">
                  <div className="order-type-icon">
                    {TYPE_EMOJIS[item.type] || '📋'}
                  </div>
                  <div className="order-info">
                    <div className="order-title">
                      {item.typeLabel}
                      {item.characterId && (
                        <span className="order-char-name">
                          {' · '}{getCharacterName(item.characterId)}
                        </span>
                      )}
                    </div>
                    <div className="order-meta">
                      <span className={`order-status ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="order-date">{formatDate(item.date)}</span>
                    </div>
                    {item.message && (
                      <div className="order-message">"{item.message}"</div>
                    )}
                    {item.plan && (
                      <div className="order-plan">{item.plan} plan</div>
                    )}
                  </div>
                </div>
                <div className="order-amount">
                  {item.type === 'deposit' ? '+' : ''}
                  {item.type === 'withdrawal' ? '-' : ''}
                  ${item.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
