import { computed, reactive, ref } from 'vue'

// ── API base URL — update to match your server path ──────────
const API_BASE = import.meta.env.BASE_URL + 'resources/apis.php'

// ── Auth is kept entirely in localStorage (no server session) ─
const AUTH_KEY = 'gamebench-user-v1'

function loadCurrentUser() {
  try {
    const saved = localStorage.getItem(AUTH_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function persistUser(user) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
}

// ── Shared state (mirrors the original store shape) ───────────
const state = reactive({
  games: [],
  reviews: [],
  currentUser: loadCurrentUser(),
  votes: {},
})

// ── Generic REST helpers ──────────────────────────────────────

function apiGet(table, field = '', value = '') {
  const path = field ? `${API_BASE}/${table}/${field}/${encodeURIComponent(value)}` : `${API_BASE}/${table}`
  return fetch(path).then(res => {
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  })
}

function apiPost(table, body) {
  return fetch(`${API_BASE}/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(res => {
    if (!res.ok) throw new Error(`POST ${table} failed: ${res.status}`)
    return res.json()           // { id: <newId> }
  })
}

function apiPut(table, field, value, body) {
  const path = `${API_BASE}/${table}/${field}/${encodeURIComponent(value)}`
  return fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(res => {
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json()           // { affected: n }
  })
}

function apiDelete(table, field, value) {
  const path = `${API_BASE}/${table}/${field}/${encodeURIComponent(value)}`
  return fetch(path, { method: 'DELETE' }).then(res => {
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json()           // { affected: n }
  })
}

// ── Slug helper ───────────────────────────────────────────────

function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Composable ───────────────────────────────────────────────

export function useAppStore() {
  const isAuthenticated = computed(() => Boolean(state.currentUser))
  const isAdmin = computed(() => state.currentUser?.role === 'admin')

  // ── Data loading (call once from App.vue) ──────────────────

  function loadGames() {
    return apiGet('games').then(data => { state.games = data })
  }

  function loadReviews() {
    return apiGet('reviews').then(data => { state.reviews = data })
  }

  // ── Auth ───────────────────────────────────────────────────

  function login(email, password) {
    return apiGet('users', 'email', email).then(rows => {
      const user = rows[0]
      if (!user || user.password !== password) return false
      const profile = { id: Number(user.id), name: user.name, email: user.email, role: user.role }
      state.currentUser = profile
      persistUser(profile)
      return true
    })
  }

  function register(payload) {
    return apiGet('users', 'email', payload.email).then(existing => {
      if (existing.length > 0) {
        return { ok: false, message: 'An account with this email already exists.' }
      }
      return apiGet('users').then(allUsers => {
        const role = allUsers.length === 0 ? 'admin' : 'member'
        return apiPost('users', { ...payload, role }).then(result => {
          const profile = { id: result.id, name: payload.name, email: payload.email, role }
          state.currentUser = profile
          persistUser(profile)
          return { ok: true }
        })
      })
    })
  }

  function logout() {
    state.currentUser = null
    persistUser(null)
  }

  function updateCurrentUser(fields) {
    state.currentUser = { ...state.currentUser, ...fields }
    persistUser(state.currentUser)
  }

  // ── Games ──────────────────────────────────────────────────

  function addGame(payload) {
    return apiPost('games', {
      ...payload,
      slug: makeSlug(payload.title),
      releaseYear: Number(payload.releaseYear),
      rating: Number(payload.rating || 0),
      likes: 0,
      coverTheme: payload.coverTheme || 'cover-space',
      platform: Array.isArray(payload.platform)
        ? payload.platform
        : String(payload.platform).split(',').map(s => s.trim()),
    }).then(() => loadGames())
  }

  function updateGame(id, payload) {
    return apiPut('games', 'id', id, {
      ...payload,
      slug: makeSlug(payload.title),
      releaseYear: Number(payload.releaseYear),
      rating: Number(payload.rating),
    }).then(() => loadGames())
  }

  function deleteGame(id) {
    return apiDelete('games', 'id', id).then(() => {
      state.games = state.games.filter(g => g.id !== id)
      state.reviews = state.reviews.filter(r => r.gameId !== id)
    })
  }

  function toggleLike(gameId) {
    const key = `${state.currentUser?.email || 'guest'}-${gameId}`
    const game = state.games.find(g => g.id === gameId)
    if (!game) return

    const newLikes = state.votes[key]
      ? Math.max(0, game.likes - 1)
      : game.likes + 1

    return apiPut('games', 'id', gameId, { likes: newLikes }).then(() => {
      game.likes = newLikes
      if (state.votes[key]) {
        delete state.votes[key]
      } else {
        state.votes[key] = true
      }
    })
  }

  // ── Reviews ────────────────────────────────────────────────

  function addReview(payload) {
    return apiPost('reviews', {
      ...payload,
      score: Number(payload.score),
    }).then(() => loadReviews())
  }

  function updateReview(id, fields) {
    return apiPut('reviews', 'id', id, fields).then(() => loadReviews())
  }

  function deleteReview(id) {
    return apiDelete('reviews', 'id', id).then(() => {
      state.reviews = state.reviews.filter(r => r.id !== id)
    })
  }

  return {
    state,
    isAuthenticated,
    isAdmin,

    // Data loading
    loadGames,
    loadReviews,

    // Auth
    login,
    register,
    logout,
    updateCurrentUser,

    // Games
    addGame,
    updateGame,
    deleteGame,
    toggleLike,

    // Reviews
    addReview,
    updateReview,
    deleteReview,
  }
}