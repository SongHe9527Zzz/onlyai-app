import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import characters from '../data/characters'

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ characters: [], users: [] })
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const performSearch = async (q) => {
    if (!q || q.trim().length < 1) {
      setResults({ characters: [], users: [] })
      setSearched(false)
      return
    }

    setSearching(true)
    setSearched(true)

    try {
      const res = await api.get(`/api/account/search?q=${encodeURIComponent(q.trim())}`)
      setResults(res.data)
    } catch {
      // Fallback: local search
      const qLower = q.trim().toLowerCase()
      const localChars = characters.filter(c =>
        c.name.toLowerCase().includes(qLower) ||
        c.tagline.toLowerCase().includes(qLower) ||
        c.tags.some(t => t.toLowerCase().includes(qLower))
      )
      setResults({ characters: localChars, users: [] })
    } finally {
      setSearching(false)
    }
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(val)
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    setResults({ characters: [], users: [] })
    setSearched(false)
    if (inputRef.current) inputRef.current.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      performSearch(query)
    }
  }

  const totalResults = results.characters.length + results.users.length

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="search-page">
        <div className="search-header">
          <button className="settings-back" onClick={() => navigate(-1)}>←</button>
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search creators and characters..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button className="search-clear" onClick={handleClear}>✕</button>
            )}
          </div>
        </div>

        {/* Loading */}
        {searching && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Empty state */}
        {!searching && searched && query && totalResults === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>No results found</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Try searching with different keywords like names or tags
            </p>
          </div>
        )}

        {/* Initial state */}
        {!searching && !searched && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Search Characters</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Search by name, tag, or description
            </p>
            <div className="search-tags-hint" style={{ marginTop: 20 }}>
              <span>Popular: </span>
              {['Aria', 'Yuna', 'Mochi', 'Nova', 'Egirl', 'Fitness', 'Latin'].map(tag => (
                <button
                  key={tag}
                  className="search-hint-tag"
                  onClick={() => {
                    setQuery(tag)
                    performSearch(tag)
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!searching && searched && totalResults > 0 && (
          <>
            {/* Character results */}
            {results.characters.length > 0 && (
              <div className="search-results-section">
                <div className="search-results-header">
                  <h3>Characters</h3>
                  <span className="search-results-count">{results.characters.length} found</span>
                </div>
                {results.characters.map(char => {
                  const fullChar = characters.find(c => c.id === char.id) || char
                  return (
                    <div
                      key={char.id}
                      className="search-result-card"
                      onClick={() => navigate(`/profile/${char.id}`)}
                    >
                      <div className="search-result-avatar">
                        <img
                          src={fullChar.image || `images/${char.id}_portrait.png`}
                          alt={char.name}
                          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = char.name[0] }}
                        />
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-name">{char.name}</div>
                        <div className="search-result-tagline">{char.tagline}</div>
                        <div className="search-result-tags">
                          {char.tags?.slice(0, 3).map(t => (
                            <span key={t} className="search-result-tag">{t}</span>
                          ))}
                        </div>
                      </div>
                      <span className="search-result-arrow">▸</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* User results */}
            {results.users.length > 0 && (
              <div className="search-results-section">
                <div className="search-results-header">
                  <h3>Users</h3>
                  <span className="search-results-count">{results.users.length} found</span>
                </div>
                {results.users.map(u => (
                  <div key={u.id} className="search-result-card">
                    <div className="search-result-avatar">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.username} />
                      ) : (
                        <div className="search-user-initial">
                          {(u.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-name">{u.username}</div>
                      {u.bio && <div className="search-result-tagline">{u.bio}</div>}
                    </div>
                    <span className="search-result-arrow">▸</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
