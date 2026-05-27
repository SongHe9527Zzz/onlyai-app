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

export default api
