import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ADMIN_KEY_STORAGE = 'onlyai_admin_key'

export default function Admin() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(localStorage.getItem(ADMIN_KEY_STORAGE) || '')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Dashboard data
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [userSearch, setUserSearch] = useState('')
  const [characters, setCharacters] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [subsPagination, setSubsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // Content moderation data
  const [posts, setPosts] = useState([])
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [postsFilter, setPostsFilter] = useState('')
  const [reports, setReports] = useState([])
  const [reportsPagination, setReportsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  const [activeTab, setActiveTab] = useState('overview')
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const headers = { 'x-admin-key': adminKey }

  // ─── Data fetching ──────────────────────────────────
  const fetchAllData = useCallback(async (key) => {
    setLoading(true)
    setError('')
    try {
      const [statsRes] = await Promise.all([
        api.get('/api/admin/stats', { headers: { 'x-admin-key': key } })
      ])
      setStats(statsRes.data)
      setAuthenticated(true)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('认证失败，请检查管理密钥')
        setAuthenticated(false)
      } else {
        setError(`获取数据失败: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    try {
      const res = await api.get('/api/admin/users', {
        headers,
        params: { page, limit: 20, search }
      })
      setUsers(res.data.users || [])
      setUserPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (err) {
      showToast('获取用户列表失败', 'error')
    }
  }, [adminKey])

  const fetchPosts = useCallback(async (page = 1, status = '') => {
    try {
      const res = await api.get('/api/admin/posts', {
        headers,
        params: { page, limit: 20, status }
      })
      setPosts(res.data.posts || [])
      setPostsPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (err) {
      showToast('获取内容列表失败', 'error')
    }
  }, [adminKey])

  const fetchReports = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/api/admin/reports', {
        headers,
        params: { page, limit: 20 }
      })
      setReports(res.data.reports || [])
      setReportsPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (err) {
      showToast('获取举报列表失败', 'error')
    }
  }, [adminKey])

  const fetchSubscriptions = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/api/admin/subscriptions', {
        headers,
        params: { page, limit: 20 }
      })
      setSubscriptions(res.data.subscriptions || [])
      setSubsPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (err) {
      showToast('获取订阅列表失败', 'error')
    }
  }, [adminKey])

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/characters', { headers })
      setCharacters(res.data.characters || [])
    } catch (err) { /* ignore */ }
  }, [adminKey])

  // ─── Tab switching auto-fetch ───────────────────────
  useEffect(() => {
    if (!authenticated || !adminKey) return
    switch (activeTab) {
      case 'users':
        fetchUsers(1, userSearch)
        break
      case 'moderation':
        fetchPosts(1, postsFilter)
        break
      case 'reports':
        fetchReports(1)
        break
      case 'subscriptions':
        fetchSubscriptions(1)
        break
      case 'characters':
        fetchCharacters()
        break
      default:
        break
    }
  }, [activeTab])

  // Initial fetch
  useEffect(() => {
    if (adminKey && authenticated) {
      fetchAllData(adminKey)
    } else {
      setLoading(false)
    }
  }, [adminKey, authenticated, fetchAllData])

  // ─── Actions ────────────────────────────────────────
  const handleTogglePostStatus = async (postId, newStatus) => {
    try {
      await api.patch(`/api/admin/posts/${postId}/status`, { status: newStatus }, { headers })
      showToast(newStatus === 'removed' ? '内容已下架' : '内容已恢复')
      fetchPosts(postsPagination.page, postsFilter)
      // Refresh stats
      fetchAllData(adminKey)
    } catch (err) {
      showToast('操作失败', 'error')
    }
  }

  const handleResolveReport = async (reportId, status) => {
    try {
      await api.patch(`/api/admin/reports/${reportId}/status`, { status }, { headers })
      showToast(status === 'resolved' ? '举报已处理' : '举报已驳回')
      fetchReports(reportsPagination.page)
      fetchAllData(adminKey)
    } catch (err) {
      showToast('操作失败', 'error')
    }
  }

  const handleRestrictUser = async (userId, type, reason) => {
    const duration = prompt(`请输入${type === 'ban' ? '封禁' : type === 'mute' ? '禁言' : '限流'}时长（小时）：`, '24')
    if (!duration) return
    try {
      await api.patch(`/api/admin/users/${userId}/restrict`,
        { type, reason: reason || `${type} by admin`, duration_hours: parseInt(duration) },
        { headers }
      )
      showToast(`用户已${type === 'ban' ? '封禁' : type === 'mute' ? '禁言' : '限流'}`)
      fetchUsers(userPagination.page, userSearch)
    } catch (err) {
      showToast('操作失败', 'error')
    }
  }

  const handleLiftRestrictions = async (userId) => {
    try {
      await api.delete(`/api/admin/users/${userId}/restrictions`, { headers })
      showToast('用户限制已解除')
      fetchUsers(userPagination.page, userSearch)
    } catch (err) {
      showToast('操作失败', 'error')
    }
  }

  const handleLogin = async () => {
    if (!adminKey.trim()) {
      setError('请输入管理密钥')
      return
    }
    localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim())
    await fetchAllData(adminKey.trim())
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE)
    setAdminKey('')
    setAuthenticated(false)
    setStats(null)
    setUsers([])
    setPosts([])
    setReports([])
    setError('')
  }

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('zh-CN') : '-'

  // ─── Login Screen ──────────────────────────────────
  if (!authenticated) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">🔐</div>
            <h1>OnlyAI 管理后台</h1>
            <p>请输入管理密钥以访问后台</p>
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
            {loading ? '验证中...' : '进入后台'}
          </button>
          <div className="admin-login-footer">
            <button className="admin-link-btn" onClick={() => navigate('/')}>← 返回首页</button>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 12 }}>
              API Key: onlyai-admin-key-2026
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>加载管理数据...</p>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //  MAIN DASHBOARD
  // ═══════════════════════════════════════════════════════
  return (
    <div className="admin-dashboard">
      {/* Toast */}
      {toastMsg && <div className={`admin-toast ${toastType}`}>{toastMsg}</div>}

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>📊 OnlyAI 管理后台</h1>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="admin-header-right">
          <span className="admin-timestamp">更新于 {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString('zh-CN') : '-'}</span>
          <button className="admin-btn admin-btn-outline" onClick={() => { fetchAllData(adminKey); fetchCharacters() }}>🔄 刷新</button>
          <button className="admin-btn admin-btn-danger" onClick={handleLogout}>退出</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { id: 'overview', label: '📈 概览' },
          { id: 'moderation', label: `🛡️ 内容审核${stats?.pendingReports ? ` (${stats.pendingReports})` : ''}` },
          { id: 'reports', label: '🚨 举报处理' },
          { id: 'users', label: '👥 用户管理' },
          { id: 'subscriptions', label: '💳 订阅' },
          { id: 'characters', label: '🎭 角色' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW ═══════════ */}
      {activeTab === 'overview' && stats && (
        <div className="admin-overview">
          {/* Stats Cards Row */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="stat-icon">👥</div>
              <div className="stat-body">
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">总用户数</div>
              </div>
            </div>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
              <div className="stat-icon">✨</div>
              <div className="stat-body">
                <div className="stat-value">{stats.newUsersToday}</div>
                <div className="stat-label">今日新增</div>
                <div className="stat-sub">本周: {stats.newUsersWeek} | 本月: {stats.newUsersMonth}</div>
              </div>
            </div>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="stat-icon">⭐</div>
              <div className="stat-body">
                <div className="stat-value">{stats.paidUsers}</div>
                <div className="stat-label">付费用户</div>
                <div className="stat-sub">付费率: {stats.conversionRate}%</div>
              </div>
            </div>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
              <div className="stat-icon">💰</div>
              <div className="stat-body">
                <div className="stat-value">{formatCurrency(stats.mrr)}</div>
                <div className="stat-label">MRR</div>
                <div className="stat-sub">ARPU: {formatCurrency(stats.arpu)} | {stats.totalActiveSubs} 活跃订阅</div>
              </div>
            </div>
          </div>

          {/* Activity Metrics Row */}
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="stat-icon">📅</div>
              <div className="stat-body">
                <div className="stat-value">{stats.dau}</div>
                <div className="stat-label">日活 (DAU)</div>
              </div>
            </div>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="stat-icon">📊</div>
              <div className="stat-body">
                <div className="stat-value">{stats.wau}</div>
                <div className="stat-label">周活 (WAU)</div>
              </div>
            </div>
            <div className="admin-stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
              <div className="stat-icon">📈</div>
              <div className="stat-body">
                <div className="stat-value">{stats.mau}</div>
                <div className="stat-label">月活 (MAU) ≈ 注册数</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="admin-charts-row">
            {/* Plan Distribution */}
            <div className="admin-chart-card">
              <h3>📊 订阅计划分布 (共{stats.totalActiveSubs}个)</h3>
              {stats.subscriptionsByPlan && stats.subscriptionsByPlan.length > 0 ? (
                <div className="admin-plan-list">
                  {[{ plan: 'premium', label: '🌟 Premium', color: '#ec4899' },
                    { plan: 'standard', label: '📘 Standard', color: '#6366f1' },
                    { plan: 'vip', label: '👑 VIP', color: '#f59e0b' }
                  ].filter(p => stats.subscriptionsByPlan.find(x => x.plan === p.plan)).map(p => {
                    const entry = stats.subscriptionsByPlan.find(x => x.plan === p.plan)
                    const total = stats.subscriptionsByPlan.reduce((s, x) => s + parseInt(x.count), 0)
                    const pct = total ? Math.round(parseInt(entry.count) / total * 100) : 0
                    return (
                      <div key={p.plan} className="admin-plan-item">
                        <div className="admin-plan-info">
                          <span className="admin-plan-name" style={{ color: p.color }}>{p.label}</span>
                          <span className="admin-plan-count">{entry.count} 订阅 ({pct}%)</span>
                        </div>
                        <div className="admin-plan-bar-bg">
                          <div className="admin-plan-bar" style={{ width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="admin-empty">暂无订阅数据</div>
              )}
              <div className="admin-plan-summary">
                Premium占比: <strong>{stats.premiumPct}%</strong> | Standard占比: <strong>{stats.standardPct}%</strong>
              </div>
            </div>

            {/* Character Rankings */}
            <div className="admin-chart-card">
              <h3>🎭 角色订阅排行</h3>
              {stats.subscriptionsByCharacter && stats.subscriptionsByCharacter.length > 0 ? (
                <div className="admin-char-ranking">
                  {stats.subscriptionsByCharacter.map((c, i) => {
                    const maxCount = Math.max(...stats.subscriptionsByCharacter.map(x => parseInt(x.count)))
                    const pct = maxCount ? Math.round(parseInt(c.count) / maxCount * 100) : 0
                    return (
                      <div key={c.character_id} className="admin-char-row">
                        <span className="admin-char-rank">#{i + 1}</span>
                        <span className="admin-char-name">{c.character_id}</span>
                        <div className="admin-char-bar-bg">
                          <div className="admin-char-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="admin-char-count">{c.count}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="admin-empty">暂无订阅数据</div>
              )}
            </div>

            {/* Content Stats */}
            <div className="admin-chart-card">
              <h3>📝 内容概览</h3>
              <div className="admin-content-stats">
                <div className="admin-content-stat">
                  <span className="admin-cs-label">总内容数</span>
                  <span className="admin-cs-value">{stats.totalPosts}</span>
                </div>
                <div className="admin-content-stat">
                  <span className="admin-cs-label">已下架</span>
                  <span className="admin-cs-value" style={{ color: '#ef4444' }}>{stats.removedPosts}</span>
                </div>
                <div className="admin-content-stat">
                  <span className="admin-cs-label">待处理举报</span>
                  <span className="admin-cs-value" style={{ color: '#f59e0b' }}>{stats.pendingReports}</span>
                </div>
                <div className="admin-content-stat">
                  <span className="admin-cs-label">内容健康率</span>
                  <span className="admin-cs-value" style={{ color: '#22c55e' }}>
                    {stats.totalPosts > 0 ? Math.round((1 - stats.removedPosts / stats.totalPosts) * 100) : 100}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-actions-card">
            <h3>⚡ 快捷操作</h3>
            <div className="admin-actions">
              <button className="admin-action-btn" onClick={() => setActiveTab('moderation')}>
                🛡️ 内容审核 {stats.pendingReports > 0 && <span className="admin-badge-pulse">{stats.pendingReports}</span>}
              </button>
              <button className="admin-action-btn" onClick={() => setActiveTab('reports')}>
                🚨 举报处理 {stats.pendingReports > 0 && <span className="admin-badge-pulse">{stats.pendingReports}</span>}
              </button>
              <button className="admin-action-btn" onClick={() => setActiveTab('users')}>
                👥 用户管理
              </button>
              <button className="admin-action-btn" onClick={() => setActiveTab('subscriptions')}>
                💳 订阅记录
              </button>
              <button className="admin-action-btn" onClick={() => setActiveTab('characters')}>
                🎭 角色数据
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CONTENT MODERATION ═══════════ */}
      {activeTab === 'moderation' && (
        <div className="admin-table-page">
          <div className="admin-page-header">
            <h3>🛡️ 内容审核 ({postsPagination.total})</h3>
            <div className="admin-filter-group">
              <select
                className="admin-select"
                value={postsFilter}
                onChange={e => { setPostsFilter(e.target.value); fetchPosts(1, e.target.value) }}
              >
                <option value="">全部内容</option>
                <option value="published">已发布</option>
                <option value="removed">已下架</option>
              </select>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="admin-empty">暂无内容数据</div>
          ) : (
            <>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>作者</th>
                      <th>角色</th>
                      <th>内容预览</th>
                      <th>状态</th>
                      <th>♥️ 赞</th>
                      <th>💬 评</th>
                      <th>发布时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map(p => (
                      <tr key={p.id}>
                        <td className="admin-cell-id">#{p.id}</td>
                        <td>{p.author_name}</td>
                        <td><span className="admin-char-badge">{p.character_id}</span></td>
                        <td className="admin-cell-content">{p.content?.substring(0, 50)}{p.content?.length > 50 ? '...' : ''}</td>
                        <td>
                          <span className={`admin-status-badge ${p.status}`}>
                            {p.status === 'published' ? '✅ 已发布' : p.status === 'removed' ? '❌ 已下架' : p.status}
                          </span>
                        </td>
                        <td>{p.likes_count}</td>
                        <td>{p.comments_count}</td>
                        <td className="admin-cell-date">{formatDate(p.created_at)}</td>
                        <td>
                          <div className="admin-cell-actions">
                            {p.status === 'published' ? (
                              <button
                                className="admin-btn-sm admin-btn-danger-sm"
                                onClick={() => handleTogglePostStatus(p.id, 'removed')}
                                title="下架内容"
                              >
                                下架
                              </button>
                            ) : (
                              <button
                                className="admin-btn-sm admin-btn-success-sm"
                                onClick={() => handleTogglePostStatus(p.id, 'published')}
                                title="恢复内容"
                              >
                                恢复
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {postsPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={postsPagination.page <= 1} onClick={() => fetchPosts(postsPagination.page - 1, postsFilter)}>←</button>
                  <span>{postsPagination.page} / {postsPagination.totalPages}</span>
                  <button disabled={postsPagination.page >= postsPagination.totalPages} onClick={() => fetchPosts(postsPagination.page + 1, postsFilter)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ REPORTS ═══════════ */}
      {activeTab === 'reports' && (
        <div className="admin-table-page">
          <div className="admin-page-header">
            <h3>🚨 举报处理 ({reportsPagination.total})</h3>
          </div>

          {reports.length === 0 ? (
            <div className="admin-empty">暂无举报数据</div>
          ) : (
            <>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>举报原因</th>
                      <th>关联内容</th>
                      <th>内容作者</th>
                      <th>状态</th>
                      <th>举报时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td className="admin-cell-id">#{r.id}</td>
                        <td>
                          <span className="admin-report-reason">{r.reason}</span>
                        </td>
                        <td className="admin-cell-content">{r.post?.content?.substring(0, 40) || '已删除'}...</td>
                        <td>{r.post?.author_name || '-'}</td>
                        <td>
                          <span className={`admin-status-badge ${r.status}`}>
                            {r.status === 'pending' ? '⏳ 待处理' : r.status === 'resolved' ? '✅ 已处理' : '❌ 已驳回'}
                          </span>
                        </td>
                        <td className="admin-cell-date">{formatDate(r.created_at)}</td>
                        <td>
                          <div className="admin-cell-actions">
                            {r.status === 'pending' && (
                              <>
                                <button
                                  className="admin-btn-sm admin-btn-danger-sm"
                                  onClick={() => {
                                    handleTogglePostStatus(r.post_id, 'removed')
                                    handleResolveReport(r.id, 'resolved')
                                  }}
                                >
                                  下架并处理
                                </button>
                                <button
                                  className="admin-btn-sm admin-btn-warning-sm"
                                  onClick={() => handleResolveReport(r.id, 'dismissed')}
                                >
                                  驳回
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportsPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={reportsPagination.page <= 1} onClick={() => fetchReports(reportsPagination.page - 1)}>←</button>
                  <span>{reportsPagination.page} / {reportsPagination.totalPages}</span>
                  <button disabled={reportsPagination.page >= reportsPagination.totalPages} onClick={() => fetchReports(reportsPagination.page + 1)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ USERS ═══════════ */}
      {activeTab === 'users' && (
        <div className="admin-table-page">
          <div className="admin-page-header">
            <h3>👥 用户管理 ({userPagination.total})</h3>
            <div className="admin-filter-group">
              <input
                type="text"
                className="admin-input admin-input-sm"
                placeholder="搜索用户名/邮箱..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers(1, userSearch)}
              />
              <button className="admin-btn-sm admin-btn-outline-sm" onClick={() => fetchUsers(1, userSearch)}>搜索</button>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="admin-empty">暂无用户数据</div>
          ) : (
            <>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>用户名</th>
                      <th>邮箱</th>
                      <th>注册时间</th>
                      <th>活跃订阅</th>
                      <th>当前状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const restriction = u.active_restriction
                      return (
                        <tr key={u.id}>
                          <td className="admin-cell-username">{u.username}</td>
                          <td>{u.email}</td>
                          <td className="admin-cell-date">{formatDate(u.created_at)}</td>
                          <td><span className="admin-badge-count">{u.active_subs}</span></td>
                          <td>
                            {restriction ? (
                              <span className={`admin-status-badge ${restriction.type}`}>
                                {restriction.type === 'ban' ? '🚫 已封禁' : restriction.type === 'mute' ? '🔇 已禁言' : '⚠️ 已限流'}
                              </span>
                            ) : (
                              <span className="admin-status-badge active">✅ 正常</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-cell-actions">
                              {restriction ? (
                                <button
                                  className="admin-btn-sm admin-btn-success-sm"
                                  onClick={() => handleLiftRestrictions(u.id)}
                                >
                                  解除限制
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="admin-btn-sm admin-btn-warning-sm"
                                    onClick={() => handleRestrictUser(u.id, 'mute', '违规行为')}
                                    title="禁言"
                                  >
                                    🔇 禁言
                                  </button>
                                  <button
                                    className="admin-btn-sm admin-btn-danger-sm"
                                    onClick={() => handleRestrictUser(u.id, 'ban', '严重违规')}
                                    title="封禁"
                                  >
                                    🚫 封禁
                                  </button>
                                </>
                              )}
                              {u.active_subs > 0 && (
                                <span className="admin-cell-subs-more" title={u.sub_details}>
                                  📋 {u.active_subs}个订阅
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {userPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={userPagination.page <= 1} onClick={() => fetchUsers(userPagination.page - 1, userSearch)}>←</button>
                  <span>{userPagination.page} / {userPagination.totalPages}</span>
                  <button disabled={userPagination.page >= userPagination.totalPages} onClick={() => fetchUsers(userPagination.page + 1, userSearch)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ SUBSCRIPTIONS ═══════════ */}
      {activeTab === 'subscriptions' && (
        <div className="admin-table-page">
          <h3>💳 订阅记录 ({subsPagination.total})</h3>
          {subscriptions.length === 0 ? (
            <div className="admin-empty">暂无订阅数据</div>
          ) : (
            <>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>用户</th>
                      <th>角色</th>
                      <th>方案</th>
                      <th>状态</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(s => (
                      <tr key={s.id}>
                        <td className="admin-cell-id">#{s.id}</td>
                        <td>{s.username || s.email || s.user_id?.substring(0, 8)}</td>
                        <td><span className="admin-char-badge">{s.character_id}</span></td>
                        <td>
                          <span className={`admin-plan-badge ${s.plan}`}>
                            {s.plan === 'premium' ? '🌟 Premium' : s.plan === 'standard' ? '📘 Standard' : '👑 VIP'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status-badge ${s.status}`}>
                            {s.status === 'active' ? '✅ 活跃' : s.status === 'cancelled' ? '❌ 已取消' : s.status}
                          </span>
                        </td>
                        <td className="admin-cell-date">{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {subsPagination.totalPages > 1 && (
                <div className="admin-pagination">
                  <button disabled={subsPagination.page <= 1} onClick={() => fetchSubscriptions(subsPagination.page - 1)}>←</button>
                  <span>{subsPagination.page} / {subsPagination.totalPages}</span>
                  <button disabled={subsPagination.page >= subsPagination.totalPages} onClick={() => fetchSubscriptions(subsPagination.page + 1)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ CHARACTERS ═══════════ */}
      {activeTab === 'characters' && (
        <div className="admin-table-page">
          <h3>🎭 角色订阅统计</h3>
          {characters.length === 0 ? (
            <div className="admin-empty">暂无数据</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>角色</th>
                    <th>活跃订阅</th>
                    <th>Standard</th>
                    <th>Premium</th>
                    <th>预估收入</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((c, i) => (
                    <tr key={c.id}>
                      <td className="admin-cell-rank">#{i + 1}</td>
                      <td>
                        <span className="admin-char-avatar">{c.name?.[0] || '?'}</span>
                        {c.name || c.id}
                      </td>
                      <td><span className="admin-badge-count">{c.active_subs}</span></td>
                      <td>{c.standard_subs}</td>
                      <td>{c.premium_subs}</td>
                      <td className="admin-cell-revenue">{formatCurrency(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         STYLES
         ════════════════════════════════════════════════════════════ */}
      <style>{`
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          padding: 20px;
        }
        .admin-login-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          text-align: center;
        }
        .admin-login-header .admin-logo { font-size: 48px; margin-bottom: 16px; }
        .admin-login-header h1 { font-size: 24px; color: #fff; margin: 0 0 8px; }
        .admin-login-header p { color: rgba(255,255,255,0.5); font-size: 14px; margin: 0; }
        .admin-error-banner {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin: 16px 0;
        }
        .admin-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          outline: none;
          margin: 16px 0;
          box-sizing: border-box;
        }
        .admin-input:focus { border-color: #6366f1; }
        .admin-input-sm {
          padding: 8px 12px;
          font-size: 13px;
          margin: 0;
          width: auto;
          min-width: 180px;
        }
        .admin-select {
          padding: 8px 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          outline: none;
        }
        .admin-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .admin-btn-primary { width: 100%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
        .admin-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
        .admin-btn-outline { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); font-size: 13px; padding: 8px 16px; }
        .admin-btn-outline:hover { background: rgba(255,255,255,0.1); }
        .admin-btn-danger { background: rgba(239,68,68,0.15); color: #ef4444; font-size: 13px; padding: 8px 16px; }
        .admin-btn-danger:hover { background: rgba(239,68,68,0.25); }
        .admin-btn-sm { padding: 4px 10px; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .admin-btn-danger-sm { background: rgba(239,68,68,0.15); color: #ef4444; }
        .admin-btn-danger-sm:hover { background: rgba(239,68,68,0.25); }
        .admin-btn-success-sm { background: rgba(34,197,94,0.15); color: #4ade80; }
        .admin-btn-success-sm:hover { background: rgba(34,197,94,0.25); }
        .admin-btn-warning-sm { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .admin-btn-warning-sm:hover { background: rgba(245,158,11,0.25); }
        .admin-btn-outline-sm { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); padding: 7px 12px; border-radius: 10px; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .admin-link-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 14px; margin-top: 20px; }
        .admin-link-btn:hover { color: rgba(255,255,255,0.7); }
        .admin-login-footer { margin-top: 16px; }

        /* Toast */
        .admin-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 9999;
          animation: slideIn 0.3s ease;
        }
        .admin-toast.success { background: rgba(34,197,94,0.9); color: #fff; }
        .admin-toast.error { background: rgba(239,68,68,0.9); color: #fff; }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Dashboard */
        .admin-dashboard { padding: 20px; max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .admin-header-left { display: flex; align-items: center; gap: 12px; }
        .admin-header-left h1 { font-size: 22px; color: #fff; margin: 0; }
        .admin-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .admin-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .admin-timestamp { font-size: 12px; color: rgba(255,255,255,0.35); }

        .admin-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          background: rgba(255,255,255,0.03);
          padding: 4px;
          border-radius: 12px;
          overflow-x: auto;
          flex-wrap: wrap;
        }
        .admin-tab {
          padding: 10px 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          cursor: pointer;
          border-radius: 10px;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .admin-tab.active { background: rgba(99,102,241,0.2); color: #a5b4fc; }
        .admin-tab:hover:not(.active) { color: rgba(255,255,255,0.7); }

        .admin-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; color: rgba(255,255,255,0.5); }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Stats */
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .admin-stat-card {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-icon { font-size: 32px; }
        .stat-value { font-size: 28px; font-weight: 700; color: #fff; line-height: 1.1; }
        .stat-label { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .stat-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }

        .admin-charts-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .admin-chart-card {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 20px;
        }
        .admin-chart-card h3 {
          font-size: 15px;
          color: rgba(255,255,255,0.8);
          margin: 0 0 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .admin-plan-list { display: flex; flex-direction: column; gap: 16px; }
        .admin-plan-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .admin-plan-name { font-size: 14px; font-weight: 600; }
        .admin-plan-count { font-size: 13px; color: rgba(255,255,255,0.5); }
        .admin-plan-bar-bg { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .admin-plan-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .admin-plan-summary { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }

        .admin-content-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .admin-content-stat { display: flex; flex-direction: column; gap: 4px; }
        .admin-cs-label { font-size: 12px; color: rgba(255,255,255,0.4); }
        .admin-cs-value { font-size: 22px; font-weight: 700; color: #fff; }

        .admin-char-ranking { display: flex; flex-direction: column; gap: 10px; }
        .admin-char-row { display: flex; align-items: center; gap: 10px; }
        .admin-char-rank { font-size: 12px; color: rgba(255,255,255,0.3); width: 24px; }
        .admin-char-name { font-size: 14px; color: #fff; width: 80px; }
        .admin-char-bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .admin-char-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 4px; transition: width 0.5s ease; }
        .admin-char-count { font-size: 13px; color: rgba(255,255,255,0.5); width: 30px; text-align: right; }

        .admin-actions-card { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 20px; }
        .admin-actions-card h3 { font-size: 15px; color: rgba(255,255,255,0.8); margin: 0 0 16px; }
        .admin-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .admin-action-btn {
          padding: 12px 20px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 12px;
          color: #a5b4fc;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .admin-action-btn:hover { background: rgba(99,102,241,0.2); }
        .admin-badge-pulse {
          background: #ef4444;
          color: #fff;
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Tables */
        .admin-table-page {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 20px;
        }
        .admin-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .admin-filter-group { display: flex; align-items: center; gap: 8px; }
        .admin-table-page h3 { font-size: 15px; color: rgba(255,255,255,0.8); margin: 0 0 16px; }
        .admin-table-wrapper { overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .admin-table th {
          text-align: left;
          padding: 12px 16px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          white-space: nowrap;
        }
        .admin-table td {
          padding: 12px 16px;
          color: rgba(255,255,255,0.8);
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        .admin-cell-id { font-family: monospace; color: rgba(255,255,255,0.4); font-size: 12px; }
        .admin-cell-username { font-weight: 600; }
        .admin-cell-date { font-size: 12px; color: rgba(255,255,255,0.4); white-space: nowrap; }
        .admin-cell-content { font-size: 12px; color: rgba(255,255,255,0.5); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .admin-cell-actions { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
        .admin-cell-revenue { color: #22c55e; font-weight: 600; }
        .admin-cell-rank { color: rgba(255,255,255,0.4); font-size: 13px; }
        .admin-cell-subs-more { font-size: 11px; color: rgba(255,255,255,0.35); }

        .admin-report-reason {
          display: inline-block;
          padding: 2px 8px;
          background: rgba(239,68,68,0.1);
          color: #f87171;
          border-radius: 6px;
          font-size: 12px;
        }

        .admin-badge-count { display: inline-block; background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .admin-char-avatar { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: rgba(99,102,241,0.2); border-radius: 50%; margin-right: 8px; font-size: 13px; color: #a5b4fc; }
        .admin-char-badge { display: inline-block; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 20px; font-size: 12px; color: rgba(255,255,255,0.6); }
        .admin-plan-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .admin-plan-badge.premium { background: rgba(236,72,153,0.15); color: #f472b6; }
        .admin-plan-badge.standard { background: rgba(99,102,241,0.15); color: #a5b4fc; }
        .admin-plan-badge.vip { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .admin-status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; }
        .admin-status-badge.active { background: rgba(34,197,94,0.15); color: #4ade80; }
        .admin-status-badge.cancelled { background: rgba(239,68,68,0.15); color: #f87171; }
        .admin-status-badge.published { background: rgba(34,197,94,0.15); color: #4ade80; }
        .admin-status-badge.removed { background: rgba(239,68,68,0.15); color: #f87171; }
        .admin-status-badge.pending { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .admin-status-badge.resolved { background: rgba(34,197,94,0.15); color: #4ade80; }
        .admin-status-badge.dismissed { background: rgba(107,114,128,0.15); color: #9ca3af; }
        .admin-status-badge.ban { background: rgba(239,68,68,0.2); color: #f87171; }
        .admin-status-badge.mute { background: rgba(107,114,128,0.2); color: #d1d5db; }
        .admin-status-badge.rate_limit { background: rgba(245,158,11,0.15); color: #fbbf24; }

        .admin-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .admin-pagination button {
          padding: 6px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .admin-pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
        .admin-pagination button:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .admin-pagination span { font-size: 13px; color: rgba(255,255,255,0.4); }

        .admin-empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); font-size: 14px; }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-stats-grid { grid-template-columns: 1fr 1fr; }
          .admin-stats-grid > div:nth-child(odd):last-child { grid-column: 1 / -1; }
          .admin-charts-row { grid-template-columns: 1fr; }
          .admin-page-header { flex-direction: column; align-items: stretch; }
          .admin-tab { font-size: 12px; padding: 8px 12px; }
        }
      `}</style>
    </div>
  )
}
