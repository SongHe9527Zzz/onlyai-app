import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

// Admin API key from localStorage
const ADMIN_KEY_STORAGE = 'onlyai_admin_key'

export default function ContentManager() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(localStorage.getItem(ADMIN_KEY_STORAGE) || '')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Core data
  const [characters, setCharacters] = useState([])
  const [selectedChar, setSelectedChar] = useState('')
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [typeFilter, setTypeFilter] = useState('')

  // Post form
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [formData, setFormData] = useState({
    type: 'free',
    content: '',
    imageUrls: '',
    ppvPrice: '',
    scheduledAt: '',
    locked: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Active tab
  const [activeTab, setActiveTab] = useState('list') // list | stats

  const getAuthHeaders = useCallback((key) => ({
    'x-admin-key': key || adminKey
  }), [adminKey])

  const fetchCharacters = useCallback(async (key) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('onlyai_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : getAuthHeaders(key)

      const res = await api.get('/api/characters', {
        headers: token ? { Authorization: `Bearer ${token}` } : { 'x-admin-key': key }
      })
      // If unauthorized, fallback to admin key
      return res.data.characters || []
    } catch (err) {
      // Try admin route
      try {
        const res = await api.get('/api/admin/characters', {
          headers: getAuthHeaders(key)
        })
        return res.data.characters || []
      } catch {
        throw err
      }
    }
  }, [getAuthHeaders])

  const fetchPosts = useCallback(async (charId, page = 1, type = '') => {
    setLoading(true)
    try {
      const token = localStorage.getItem('onlyai_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-admin-key': adminKey }
      const params = { page, limit: 20 }
      if (type) params.type = type

      const res = await api.get(`/api/characters/${charId}/posts`, { headers, params })
      setPosts(res.data.posts || [])
      setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 0 })
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setError('获取贴文列表失败')
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  const fetchStats = useCallback(async (charId) => {
    try {
      const token = localStorage.getItem('onlyai_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-admin-key': adminKey }
      const res = await api.get(`/api/characters/${charId}/posts/stats`, { headers })
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setStats(null)
    }
  }, [adminKey])

  // Login / init
  const handleLogin = async () => {
    if (!adminKey.trim()) {
      setError('请输入管理密钥')
      return
    }
    localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim())
    setLoading(true)
    setError('')

    try {
      // Try admin stats endpoint to verify key
      await api.get('/api/admin/stats', { headers: { 'x-admin-key': adminKey.trim() } })
      setAuthenticated(true)
      // Fetch characters
      const chars = await fetchCharacters(adminKey.trim())
      setCharacters(chars)
    } catch (err) {
      setError('认证失败，请检查管理密钥')
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminKey && authenticated) {
      fetchCharacters(adminKey).then(chars => setCharacters(chars))
    } else {
      setLoading(false)
    }
  }, [adminKey, authenticated, fetchCharacters])

  // When character changes, fetch posts + stats
  useEffect(() => {
    if (selectedChar && authenticated) {
      fetchPosts(selectedChar, 1, typeFilter)
      fetchStats(selectedChar)
    }
  }, [selectedChar, authenticated, fetchPosts, fetchStats])

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE)
    setAdminKey('')
    setAuthenticated(false)
    setCharacters([])
    setSelectedChar('')
    setPosts([])
    setStats(null)
    setError('')
    setShowForm(false)
    setEditingPost(null)
  }

  // ── Post CRUD ──

  const resetForm = () => {
    setFormData({ type: 'free', content: '', imageUrls: '', ppvPrice: '', scheduledAt: '', locked: false })
    setEditingPost(null)
    setFormError('')
    setShowForm(false)
  }

  const openNewForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (post) => {
    setFormData({
      type: post.type || 'free',
      content: post.content || '',
      imageUrls: (() => {
        try {
          const urls = typeof post.image_urls === 'string' ? JSON.parse(post.image_urls) : (post.image_urls || [])
          return Array.isArray(urls) ? urls.join('\n') : ''
        } catch { return '' }
      })(),
      ppvPrice: post.ppv_price ? String(post.ppv_price) : '',
      scheduledAt: post.scheduled_at ? post.scheduled_at.slice(0, 16) : '',
      locked: post.locked || false
    })
    setEditingPost(post)
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.content.trim()) {
      setFormError('请输入贴文内容')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('onlyai_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-admin-key': adminKey }

      const imageUrlList = formData.imageUrls
        ? formData.imageUrls.split('\n').map(s => s.trim()).filter(Boolean)
        : []

      const payload = {
        type: formData.type,
        content: formData.content.trim(),
        imageUrls: imageUrlList,
        ppvPrice: formData.type === 'ppv' ? parseFloat(formData.ppvPrice) || 0 : 0,
        scheduledAt: formData.scheduledAt || null,
        locked: formData.type !== 'free' ? true : formData.locked
      }

      if (editingPost) {
        await api.put(`/api/characters/${selectedChar}/posts/${editingPost.id}`, payload, { headers })
      } else {
        await api.post(`/api/characters/${selectedChar}/posts`, payload, { headers })
      }

      resetForm()
      fetchPosts(selectedChar, pagination.page, typeFilter)
      fetchStats(selectedChar)
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (post) => {
    if (!window.confirm(`确定删除这条贴文吗？\n\n"${post.content?.slice(0, 50)}..."`)) return

    try {
      const token = localStorage.getItem('onlyai_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-admin-key': adminKey }
      await api.delete(`/api/characters/${selectedChar}/posts/${post.id}`, { headers })
      fetchPosts(selectedChar, pagination.page, typeFilter)
      fetchStats(selectedChar)
    } catch (err) {
      setError('删除失败: ' + (err.response?.data?.error || err.message))
    }
  }

  // ── Render ──

  // Login screen
  if (!authenticated) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">📝</div>
            <h1>OnlyAI 内容发布管理</h1>
            <p>为角色创建和管理贴文内容</p>
          </div>
          {error && <div className="admin-error-banner">{error}</div>}
          <input
            type="password"
            className="admin-input"
            placeholder="输入管理密钥 (Admin API Key)"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <button className="admin-btn admin-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? '验证中...' : '进入管理'}
          </button>
          <div className="admin-login-footer">
            <button className="admin-link-btn" onClick={() => navigate('/admin')}>← 返回管理后台</button>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const charName = selectedChar
    ? characters.find(c => c.id === selectedChar)?.name || selectedChar
    : ''

  const getTypeLabel = (type) => {
    const map = { free: '🆓 公开', subscriber: '🔒 订阅', ppv: '💰 PPV' }
    return map[type] || type
  }

  const getTypeColor = (type) => {
    const map = { free: '#22c55e', subscriber: '#f59e0b', ppv: '#ec4899' }
    return map[type] || '#666'
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>📝 内容发布管理</h1>
          <span className="admin-badge">Publisher</span>
        </div>
        <div className="admin-header-right">
          <button className="admin-btn admin-btn-outline" onClick={() => navigate('/admin')}>
            ← 后台首页
          </button>
          <button className="admin-btn admin-btn-danger" onClick={handleLogout}>退出</button>
        </div>
      </header>

      {/* Character Selector */}
      <div className="cm-char-selector">
        <label>选择角色：</label>
        <div className="cm-char-chip-row">
          {characters.map(c => (
            <button
              key={c.id}
              className={`cm-char-chip ${selectedChar === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedChar(c.id); setShowForm(false); setEditingPost(null) }}
            >
              {c.name || c.id}
            </button>
          ))}
        </div>
      </div>

      {!selectedChar ? (
        <div className="admin-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
          <h3 style={{ color: '#fff', marginBottom: 8 }}>请选择一个角色</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>选择上方的角色来管理其贴文内容</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}>
              📋 贴文列表
            </button>
            <button className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => { setActiveTab('stats'); fetchStats(selectedChar) }}>
              📊 发布统计
            </button>
          </div>

          {error && <div className="admin-error-banner">{error}</div>}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="cm-stats-panel">
              {stats ? (
                <>
                  {/* Overview cards */}
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="stat-icon">📝</div>
                      <div className="stat-body">
                        <div className="stat-value">{stats.totalPosts}</div>
                        <div className="stat-label">总贴文数</div>
                      </div>
                    </div>
                    <div className="admin-stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
                      <div className="stat-icon">✅</div>
                      <div className="stat-body">
                        <div className="stat-value">{stats.publishedPosts}</div>
                        <div className="stat-label">已发布</div>
                      </div>
                    </div>
                    <div className="admin-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="stat-icon">📅</div>
                      <div className="stat-body">
                        <div className="stat-value">{stats.scheduledPosts}</div>
                        <div className="stat-label">定时发布</div>
                        <div className="stat-sub">待发布</div>
                      </div>
                    </div>
                    <div className="admin-stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
                      <div className="stat-icon">❤️</div>
                      <div className="stat-body">
                        <div className="stat-value">{stats.totalLikes}</div>
                        <div className="stat-label">总点赞</div>
                        <div className="stat-sub">{stats.totalComments} 条评论</div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary stats */}
                  <div className="admin-charts-row">
                    <div className="admin-chart-card">
                      <h3>📊 贴文类型分布</h3>
                      {stats.postsByType && stats.postsByType.length > 0 ? (
                        <div className="admin-plan-list">
                          {stats.postsByType.map(p => {
                            const total = stats.postsByType.reduce((s, x) => s + parseInt(x.count), 0)
                            const pct = total ? Math.round(parseInt(p.count) / total * 100) : 0
                            return (
                              <div key={p.type} className="admin-plan-item">
                                <div className="admin-plan-info">
                                  <span className="admin-plan-name" style={{ color: getTypeColor(p.type) }}>
                                    {getTypeLabel(p.type)}
                                  </span>
                                  <span className="admin-plan-count">{p.count} 篇 ({pct}%)</span>
                                </div>
                                <div className="admin-plan-bar-bg">
                                  <div className="admin-plan-bar" style={{
                                    width: `${pct}%`,
                                    background: getTypeColor(p.type)
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="admin-empty">暂无数据</div>
                      )}
                    </div>

                    <div className="admin-chart-card">
                      <h3>📈 近7天发布</h3>
                      {stats.postsByDay && stats.postsByDay.length > 0 ? (
                        <div className="cm-day-chart">
                          {(() => {
                            const max = Math.max(...stats.postsByDay.map(d => parseInt(d.count)), 1)
                            return stats.postsByDay.map(d => {
                              const pct = Math.round(parseInt(d.count) / max * 100)
                              return (
                                <div key={d.date} className="cm-day-bar-item">
                                  <div className="cm-day-bar-bg">
                                    <div className="cm-day-bar" style={{ height: `${pct}%` }} />
                                  </div>
                                  <span className="cm-day-label">
                                    {new Date(d.date + 'T00:00:00').toLocaleDateString('zh-CN', { weekday: 'short' })}
                                  </span>
                                  <span className="cm-day-count">{d.count}</span>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      ) : (
                        <div className="admin-empty">本月暂无发布</div>
                      )}

                      <div className="cm-stats-meta" style={{ marginTop: 16 }}>
                        <span>📅 本周发布 <strong>{stats.postsThisWeek}</strong> 篇</span>
                        <span style={{ marginLeft: 16 }}>📅 本月发布 <strong>{stats.postsThisMonth}</strong> 篇</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-loading">
                  <div className="spinner"></div>
                  <p>加载统计数据...</p>
                </div>
              )}
            </div>
          )}

          {/* Posts List Tab */}
          {activeTab === 'list' && (
            <div className="cm-posts-panel">
              {/* Filters & Actions */}
              <div className="cm-posts-toolbar">
                <div className="cm-posts-filters">
                  <select
                    className="cm-filter-select"
                    value={typeFilter}
                    onChange={e => {
                      setTypeFilter(e.target.value)
                      fetchPosts(selectedChar, 1, e.target.value)
                    }}
                  >
                    <option value="">全部类型</option>
                    <option value="free">🆓 公开</option>
                    <option value="subscriber">🔒 订阅</option>
                    <option value="ppv">💰 PPV</option>
                  </select>
                </div>
                <button className="admin-btn cm-new-post-btn" onClick={openNewForm}>
                  ✚ 新建贴文
                </button>
              </div>

              {/* New/Edit Post Form */}
              {showForm && (
                <div className="cm-post-form-card">
                  <div className="cm-post-form-header">
                    <h3>{editingPost ? '✏️ 编辑贴文' : '✨ 新建贴文'}</h3>
                    <button className="cm-form-close" onClick={resetForm}>✕</button>
                  </div>

                  {formError && <div className="admin-error-banner">{formError}</div>}

                  <form onSubmit={handleSubmit} className="cm-post-form">
                    <div className="cm-form-row">
                      <label>贴文类型 *</label>
                      <div className="cm-type-btns">
                        {[
                          { value: 'free', label: '🆓 公开', color: '#22c55e' },
                          { value: 'subscriber', label: '🔒 仅订阅', color: '#f59e0b' },
                          { value: 'ppv', label: '💰 付费(PPV)', color: '#ec4899' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`cm-type-btn ${formData.type === opt.value ? 'active' : ''}`}
                            style={formData.type === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}15` } : {}}
                            onClick={() => setFormData({ ...formData, type: opt.value, ppvPrice: opt.value === 'ppv' ? formData.ppvPrice : '' })}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.type === 'ppv' && (
                      <div className="cm-form-row">
                        <label>PPV 价格 (USD) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.99"
                          className="cm-form-input cm-form-input-short"
                          placeholder="例如: 9.99"
                          value={formData.ppvPrice}
                          onChange={e => setFormData({ ...formData, ppvPrice: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="cm-form-row">
                      <label>贴文内容 *</label>
                      <textarea
                        className="cm-form-textarea"
                        rows={4}
                        placeholder="写下你想对粉丝说的话..."
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                      />
                      <span className="cm-form-hint">{formData.content.length} / 2000 字</span>
                    </div>

                    <div className="cm-form-row">
                      <label>图片链接 (每行一个URL)</label>
                      <textarea
                        className="cm-form-textarea cm-form-textarea-sm"
                        rows={3}
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                        value={formData.imageUrls}
                        onChange={e => setFormData({ ...formData, imageUrls: e.target.value })}
                      />
                    </div>

                    <div className="cm-form-row">
                      <label>定时发布 (留空为立即发布)</label>
                      <input
                        type="datetime-local"
                        className="cm-form-input"
                        value={formData.scheduledAt}
                        onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                      />
                    </div>

                    {formData.type === 'free' && (
                      <div className="cm-form-row cm-form-row-checkbox">
                        <label className="cm-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.locked}
                            onChange={e => setFormData({ ...formData, locked: e.target.checked })}
                          />
                          <span>锁定内容（仅粉丝可见预览）</span>
                        </label>
                      </div>
                    )}

                    <div className="cm-form-actions">
                      <button type="button" className="admin-btn cm-btn-cancel" onClick={resetForm}>取消</button>
                      <button type="submit" className="admin-btn cm-btn-submit" disabled={submitting}>
                        {submitting ? '提交中...' : editingPost ? '✏️ 保存修改' : '🚀 发布贴文'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Posts List */}
              {loading ? (
                <div className="admin-loading">
                  <div className="spinner"></div>
                  <p>加载贴文列表...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="admin-empty" style={{ padding: '60px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p>暂无贴文</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                    点击右上角"新建贴文"创建第一篇内容
                  </p>
                </div>
              ) : (
                <div className="cm-post-list">
                  {posts.map(post => (
                    <div key={post.id} className="cm-post-item">
                      <div className="cm-post-header">
                        <div className="cm-post-type" style={{ color: getTypeColor(post.type) }}>
                          {getTypeLabel(post.type)}
                          {post.ppv_price > 0 && <span className="cm-post-ppv"> ${post.ppv_price}</span>}
                        </div>
                        <div className="cm-post-meta">
                          {post.scheduled_at && new Date(post.scheduled_at) > new Date()
                            ? <span className="cm-scheduled-badge">⏰ 待发布</span>
                            : <span className="cm-published-badge">✅ 已发布</span>}
                          <span className="cm-post-date">{formatDate(post.created_at)}</span>
                          <div className="cm-post-actions">
                            <button className="cm-action-btn edit" onClick={() => openEditForm(post)}
                              title="编辑">✏️</button>
                            <button className="cm-action-btn delete" onClick={() => handleDelete(post)}
                              title="删除">🗑️</button>
                          </div>
                        </div>
                      </div>
                      <div className="cm-post-content">{post.content}</div>
                      <div className="cm-post-engagement">
                        <span>❤️ {post.likes || 0}</span>
                        <span>💬 {post.comments || 0}</span>
                        {post.scheduled_at && (
                          <span className="cm-scheduled-time">
                            ⏰ 定时: {formatDate(post.scheduled_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="cm-pagination">
                      <button
                        className="cm-page-btn"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchPosts(selectedChar, pagination.page - 1, typeFilter)}
                      >←</button>
                      <span className="cm-page-info">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        className="cm-page-btn"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchPosts(selectedChar, pagination.page + 1, typeFilter)}
                      >→</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Styles */}
      <style>{`
        /* Character Selector */
        .cm-char-selector {
          padding: 16px 0 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 20px;
        }
        .cm-char-selector label {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cm-char-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .cm-char-chip {
          padding: 8px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .cm-char-chip:hover {
          border-color: rgba(255,107,157,0.3);
          color: #fff;
        }
        .cm-char-chip.active {
          background: rgba(255,107,157,0.15);
          border-color: #ff6b9d;
          color: #ff6b9d;
        }

        /* Posts Toolbar */
        .cm-posts-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cm-posts-filters {
          display: flex;
          gap: 8px;
        }
        .cm-filter-select {
          padding: 8px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        .cm-filter-select:focus { border-color: rgba(255,107,157,0.3); }
        .cm-filter-select option { background: #1a1a2e; color: #fff; }
        .cm-new-post-btn {
          background: linear-gradient(135deg, #ff6b9d, #c44dff);
          color: #fff;
          padding: 10px 20px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cm-new-post-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(196,77,255,0.3); }

        /* Post Form */
        .cm-post-form-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .cm-post-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .cm-post-form-header h3 { font-size: 16px; color: #fff; margin: 0; }
        .cm-form-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
        }
        .cm-form-close:hover { color: rgba(255,255,255,0.7); }

        .cm-post-form { display: flex; flex-direction: column; gap: 16px; }
        .cm-form-row label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cm-type-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cm-type-btn {
          padding: 10px 18px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .cm-type-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
        .cm-type-btn.active { border-width: 2px; }

        .cm-form-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          resize: vertical;
          line-height: 1.5;
          box-sizing: border-box;
        }
        .cm-form-textarea:focus { border-color: rgba(255,107,157,0.3); }
        .cm-form-textarea::placeholder { color: rgba(255,255,255,0.15); }
        .cm-form-textarea-sm { min-height: 60px; }
        .cm-form-hint {
          display: block;
          text-align: right;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: 4px;
        }

        .cm-form-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .cm-form-input:focus { border-color: rgba(255,107,157,0.3); }
        .cm-form-input-short { max-width: 200px; }

        .cm-form-row-checkbox label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          text-transform: none;
          letter-spacing: 0;
          color: rgba(255,255,255,0.7);
        }
        .cm-form-row-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #ff6b9d;
          cursor: pointer;
        }

        .cm-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 4px;
        }
        .cm-btn-cancel {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .cm-btn-cancel:hover { background: rgba(255,255,255,0.1); }
        .cm-btn-submit {
          background: linear-gradient(135deg, #ff6b9d, #c44dff);
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cm-btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(196,77,255,0.3); }
        .cm-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        /* Post List */
        .cm-post-list { display: flex; flex-direction: column; gap: 8px; }
        .cm-post-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px;
          transition: border-color 0.2s;
        }
        .cm-post-item:hover { border-color: rgba(255,255,255,0.12); }
        .cm-post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .cm-post-type { font-size: 12px; font-weight: 600; }
        .cm-post-ppv { font-size: 11px; opacity: 0.7; margin-left: 2px; }
        .cm-post-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cm-scheduled-badge {
          font-size: 10px;
          background: rgba(245,158,11,0.15);
          color: #f59e0b;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .cm-published-badge {
          font-size: 10px;
          background: rgba(34,197,94,0.15);
          color: #4ade80;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .cm-post-date { font-size: 11px; color: rgba(255,255,255,0.3); }
        .cm-post-actions { display: flex; gap: 6px; }
        .cm-action-btn {
          background: none;
          border: none;
          font-size: 15px;
          cursor: pointer;
          padding: 2px 4px;
          opacity: 0.4;
          transition: opacity 0.2s;
        }
        .cm-action-btn:hover { opacity: 1; }
        .cm-action-btn.edit:hover { color: #6366f1; }
        .cm-action-btn.delete:hover { color: #ef4444; }

        .cm-post-content {
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255,255,255,0.8);
          margin-bottom: 8px;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .cm-post-engagement {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          align-items: center;
          flex-wrap: wrap;
        }
        .cm-scheduled-time { font-size: 11px; color: #f59e0b; }

        /* Pagination */
        .cm-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px 0;
        }
        .cm-page-btn {
          padding: 8px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cm-page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .cm-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .cm-page-info { font-size: 13px; color: rgba(255,255,255,0.4); }

        /* Stats Panel */
        .cm-stats-panel {}
        .cm-day-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 140px;
          padding: 10px 0;
        }
        .cm-day-bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
        }
        .cm-day-bar-bg {
          width: 100%;
          max-width: 40px;
          height: 80px;
          background: rgba(255,255,255,0.04);
          border-radius: 6px 6px 0 0;
          overflow: hidden;
          position: relative;
        }
        .cm-day-bar {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: linear-gradient(180deg, #ff6b9d, #c44dff);
          border-radius: 6px 6px 0 0;
          transition: height 0.4s;
          min-height: 4px;
        }
        .cm-day-label { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px; }
        .cm-day-count { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 600; margin-top: 2px; }
        .cm-stats-meta { font-size: 13px; color: rgba(255,255,255,0.5); }
        .cm-stats-meta strong { color: #fff; }
      `}</style>
    </div>
  )
}
