import { computed, reactive } from 'vue'

const API_BASE = `${import.meta.env.BASE_URL}resources/apis.php`
const SESSION_KEY = 'gamebench-current-user'
const VOTES_KEY = 'gamebench-votes-v1'

function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

const state = reactive({
  games: [],
  reviews: [],
  users: [],
  currentUser: loadLocal(SESSION_KEY, null),
  votes: loadLocal(VOTES_KEY, {}),
})

function saveSession() {
  if (state.currentUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

function saveVotes() {
  localStorage.setItem(VOTES_KEY, JSON.stringify(state.votes))
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  return await response.json()
}

function dbGameToVue(game) {
  return {
    id: Number(game.id),
    slug: game.slug,
    title: game.title,
    studio: game.studio,
    genre: game.genre,
    releaseYear: Number(game.release_year),
    rating: Number(game.rating),
    likes: Number(game.likes),
    coverTheme: game.cover_theme,
    summary: game.summary,
    notes: game.notes,
    platform: [], // simple API does not automatically load game_platforms
    tags: [],

    min: {
      cpu: game.min_cpu,
      gpu: game.min_gpu,
      ram: Number(game.min_ram),
      storage: Number(game.min_storage),
      os: game.min_os,
    },

    rec: {
      cpu: game.rec_cpu,
      gpu: game.rec_gpu,
      ram: Number(game.rec_ram),
      storage: Number(game.rec_storage),
      os: game.rec_os,
    },
  }
}

function vueGameToDb(game) {
  return {
    slug: makeSlug(game.title),
    title: game.title,
    studio: game.studio,
    genre: game.genre,
    release_year: Number(game.releaseYear),
    rating: Number(game.rating || 0),
    likes: Number(game.likes || 0),
    cover_theme: game.coverTheme || 'cover-space',
    summary: game.summary,
    notes: game.notes || '',

    min_cpu: game.min.cpu,
    min_gpu: game.min.gpu,
    min_ram: Number(game.min.ram),
    min_storage: Number(game.min.storage),
    min_os: game.min.os,

    rec_cpu: game.rec.cpu,
    rec_gpu: game.rec.gpu,
    rec_ram: Number(game.rec.ram),
    rec_storage: Number(game.rec.storage),
    rec_os: game.rec.os,
  }
}

function dbReviewToVue(review) {
  return {
    id: Number(review.id),
    gameId: Number(review.game_id),
    author: review.author,
    score: Number(review.score),
    comment: review.comment,
  }
}

function vueReviewToDb(review) {
  return {
    game_id: Number(review.gameId),
    author: review.author,
    score: Number(review.score),
    comment: review.comment,
  }
}

function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function useAppStore() {
  const isAuthenticated = computed(() => Boolean(state.currentUser))
  const isAdmin = computed(() => state.currentUser?.role === 'admin')

  async function loadGames() {
    const games = await api('/games')
    state.games = games.map(dbGameToVue)
  }

  async function loadReviews() {
    const reviews = await api('/reviews')
    state.reviews = reviews.map(dbReviewToVue)
  }

  async function loadUsers() {
    state.users = await api('/users')
  }

  async function loadAll() {
    await loadGames()
    await loadReviews()
    await loadUsers()
  }

  async function login(email, password) {
    const users = await api(`/users/email/${email}`)
    const user = users.find(user => user.email === email && user.password === password)

    if (!user) return false

    state.currentUser = {
      name: user.name,
      email: user.email,
      role: user.role,
    }

    saveSession()
    return true
  }

  async function register(payload) {
    const users = await api(`/users/email/${payload.email}`)

    if (users.length > 0) {
      return {
        ok: false,
        message: 'An account with this email already exists.',
      }
    }

    const allUsers = await api('/users')
    const role = allUsers.length === 0 ? 'admin' : 'member'

    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role,
      }),
    })

    state.currentUser = {
      name: payload.name,
      email: payload.email,
      role,
    }

    saveSession()

    return { ok: true }
  }

  function logout() {
    state.currentUser = null
    saveSession()
  }

  async function addGame(payload) {
    const dbPayload = vueGameToDb(payload)

    const result = await api('/games', {
      method: 'POST',
      body: JSON.stringify(dbPayload),
    })

    state.games.push({
      ...payload,
      id: Number(result.id),
      slug: dbPayload.slug,
      likes: 0,
      rating: Number(payload.rating || 0),
      releaseYear: Number(payload.releaseYear),
    })
  }

  async function updateGame(id, payload) {
    const existing = state.games.find(game => game.id === id)
    if (!existing) return

    const updated = {
      ...existing,
      ...payload,
    }

    await api(`/games/id/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vueGameToDb(updated)),
    })

    const index = state.games.findIndex(game => game.id === id)
    state.games[index] = updated
  }

  async function deleteGame(id) {
    await api(`/games/id/${id}`, {
      method: 'DELETE',
    })

    state.games = state.games.filter(game => game.id !== id)
    state.reviews = state.reviews.filter(review => review.gameId !== id)
  }

  async function toggleLike(gameId) {
    const key = `${state.currentUser?.email || 'guest'}-${gameId}`
    const game = state.games.find(game => game.id === gameId)

    if (!game) return

    if (state.votes[key]) {
      game.likes = Math.max(0, game.likes - 1)
      delete state.votes[key]
    } else {
      game.likes += 1
      state.votes[key] = true
    }

    saveVotes()

    await api(`/games/id/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify(vueGameToDb(game)),
    })
  }

  async function addReview(payload) {
    const result = await api('/reviews', {
      method: 'POST',
      body: JSON.stringify(vueReviewToDb(payload)),
    })

    state.reviews.unshift({
      id: Number(result.id),
      ...payload,
      score: Number(payload.score),
    })
  }

  async function deleteReview(id) {
    await api(`/reviews/id/${id}`, {
      method: 'DELETE',
    })

    state.reviews = state.reviews.filter(review => review.id !== id)
  }

  async function resetDemoData() {
    state.votes = {}
    saveVotes()
    await loadAll()
  }

  return {
    state,
    isAuthenticated,
    isAdmin,
    loadGames,
    loadReviews,
    loadUsers,
    loadAll,
    login,
    register,
    logout,
    addGame,
    updateGame,
    deleteGame,
    toggleLike,
    addReview,
    deleteReview,
    resetDemoData,
  }
}