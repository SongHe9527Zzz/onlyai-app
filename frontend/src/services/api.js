import axios from 'axios'

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' ? '' : 'https://api.onlyai.app',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired — let AuthContext handle it
      localStorage.removeItem('onlyai_token')
      window.dispatchEvent(new CustomEvent('onlyai:auth:expired'))
    }
    return Promise.reject(error)
  }
)

// ─── Search API ───
export async function searchCharacters(query) {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function getSearchTags() {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch('/api/search/tags', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to load tags')
  return res.json()
}

// ─── Favorites API ───
export async function getFavorites() {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch('/api/favorites', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to load favorites')
  return res.json()
}

export async function addFavorite(characterId) {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId })
  })
  if (!res.ok) throw new Error('Failed to add favorite')
  return res.json()
}

export async function removeFavorite(characterId) {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch(`/api/favorites/${characterId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to remove favorite')
  return res.json()
}

export async function checkFavorite(characterId) {
  const token = localStorage.getItem('onlyai_token')
  const res = await fetch(`/api/favorites/check/${characterId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to check favorite')
  return res.json()
}

export default api
