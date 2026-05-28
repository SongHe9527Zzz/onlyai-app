import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchCharacters, getSearchTags, addFavorite, removeFavorite, checkFavorite } from '../services/api'
import characters from '../data/characters'

// All unique tags from characters data
function getAllTags() {
  const tagSet = new Set()
  characters.forEach(c => {
    if (c.tag) tagSet.add(c.tag)
    c.tags?.forEach(t => tagSet.add(t))
  })
  return Array.from(tagSet).sort()
}

const ALL_TAGS = getAllTags()

export default function Explore() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)
  const [sortMode, setSortMode] = useState('default') // 'default' | 'popular' | 'new'
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [favLoading, setFavLoading] = useState({})

  // Load initial favorite state
  useEffect(() => {
    async function loadFavStatus() {
      try {
        const res = await fetch('/api/favorites', {
          headers: { Authorization: `Bearer ${localStorage.getItem('onlyai_token')}` }
        })
        if (res.ok) {
          const data = await res.json()
          setFavoriteIds(new Set(data.favoriteIds || []))
        }
      } catch {}
    }
    loadFavStatus()
  }, [])

  async function toggleFavorite(e, charId) {
    e.stopPropagation()
    if (favLoading[charId]) return
    setFavLoading(prev => ({ ...prev, [charId]: true }))
    try {
      if (favoriteIds.has(charId)) {
        await removeFavorite(charId)
        setFavoriteIds(prev => { const n = new Set(prev); n.delete(charId); return n })
      } else {
        await addFavorite(charId)
        setFavoriteIds(prev => { const n = new Set(prev); n.add(charId); return n })
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err)
    } finally {
      setFavLoading(prev => ({ ...prev, [charId]: false }))
    }
  }

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const data = await searchCharacters(searchQuery.trim())
        setSearchResults(data.results || [])
        setSearchError(null)
      } catch (err) {
        console.error('Search error:', err)
        // Fallback: client-side search
        const q = searchQuery.trim().toLowerCase()
        const results = characters.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.tags?.some(t => t.toLowerCase().includes(q)) ||
          c.tag?.toLowerCase().includes(q) ||
          c.desc?.toLowerCase().includes(q) ||
          c.tagline?.toLowerCase().includes(q)
        )
        setSearchResults(results)
        setSearchError('Search server unavailable — using local results')
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Compute displayed characters based on filters, search, and sort
  const displayedCharacters = useMemo(() => {
    let chars = searchResults !== null ? searchResults : [...characters]

    // Apply tag filter
    if (selectedTag) {
      chars = chars.filter(c =>
        c.tags?.includes(selectedTag) || c.tag === selectedTag
      )
    }

    // Apply sorting
    if (sortMode === 'popular') {
      chars = [...chars].sort((a, b) => (b.subs || 0) - (a.subs || 0))
    } else if (sortMode === 'new') {
      // Sort by original order = oldest first (character definition order)
      const originalOrder = characters.map(c => c.id)
      chars = [...chars].sort((a, b) => originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id))
    }

    return chars
  }, [searchResults, selectedTag, sortMode])

  function clearFilters() {
    setSearchQuery('')
    setSearchResults(null)
    setSelectedTag(null)
    setSortMode('default')
  }

  const hasActiveFilters = searchQuery.trim() || selectedTag || sortMode !== 'default'

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      {/* Search Bar */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '8px 14px',
          border: searchQuery ? '1px solid rgba(255,107,157,0.3)' : '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.2s'
        }}>
          <span style={{ fontSize: 16, opacity: 0.4 }}>🔍</span>
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              outline: 'none'
            }}
          />
          {isSearching && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
          {searchQuery && !isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (Tag Filters) */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          onClick={() => setSelectedTag(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: !selectedTag ? 'linear-gradient(135deg, #ff6b9d, #c44dff)' : 'rgba(255,255,255,0.06)',
            color: !selectedTag ? '#fff' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s'
          }}
        >
          ✨ All
        </button>
        {ALL_TAGS.slice(0, 10).map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              background: selectedTag === tag ? 'linear-gradient(135deg, #ff6b9d, #c44dff)' : 'rgba(255,255,255,0.06)',
              color: selectedTag === tag ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s'
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 16px 12px'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'default', label: '✨ Featured' },
            { key: 'popular', label: '🔥 Popular' },
            { key: 'new', label: '🆕 New' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortMode(opt.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: sortMode === opt.key ? 'rgba(255,107,157,0.15)' : 'transparent',
                color: sortMode === opt.key ? '#ff6b9d' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results Header */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        {searchQuery && !isSearching && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {searchError ? searchError : `Found ${displayedCharacters.length} results for "${searchQuery}"`}
          </p>
        )}
        {selectedTag && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Showing {displayedCharacters.length} characters · Tag: {selectedTag}
          </p>
        )}
      </div>

      {/* Characters Grid */}
      {displayedCharacters.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'rgba(255,255,255,0.3)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, marginBottom: 8 }}>No characters found</p>
          <button
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff6b9d',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Clear filters & try again
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {displayedCharacters.map(c => (
            <div
              key={c.id}
              className="creator-card"
              onClick={() => navigate(`/profile/${c.id}`)}
            >
              <div className="cc-av">
                <img src={`images/${c.id}_portrait.png`} alt={c.name} />
              </div>
              <div className="cc-info">
                <div className="cc-name">{c.name}, {c.age}</div>
                <div className="cc-desc">{c.desc}</div>
                {c.tags && c.tags.slice(0, 2).map(t => (
                  <span key={t} className="cc-tag">{t}</span>
                ))}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button
                  onClick={e => toggleFavorite(e, c.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    cursor: favLoading[c.id] ? 'wait' : 'pointer',
                    padding: 2,
                    transition: 'transform 0.2s',
                    transform: favoriteIds.has(c.id) ? 'scale(1.15)' : 'scale(1)'
                  }}
                  title={favoriteIds.has(c.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favoriteIds.has(c.id) ? '⭐' : '☆'}
                </button>
                <div className="cc-price">
                  ${c.priceTier === 'premium' ? '15.99' : '7.99'}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                  {(c.subs || 0).toLocaleString()} subs
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creator CTA */}
      <div className="creator-cta">
        <div className="icon">🎨</div>
        <h3>Become a Creator</h3>
        <p>Design AI characters and earn up to 95% of subscription revenue. No camera needed.</p>
        <button
          className="subscribe-btn"
          onClick={() => {
            const evt = new CustomEvent('onlyai:toast', { detail: '✨ Creator onboarding coming soon!' })
            window.dispatchEvent(evt)
          }}
        >
          ✨ Start Creating
        </button>
      </div>
    </div>
  )
}
