<script setup>
import { computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const myReviews = computed(() =>
  store.state.reviews.filter((review) => review.author === store.state.currentUser?.name)
)
</script>

<template>
  <PageHeader
    title="Member Profile"
    text="Shows different content for authenticated and unauthenticated users, which is one of the project requirements."
  />

  <section class="section-band">
    <div class="container">
      <div v-if="!store.isAuthenticated.value" class="content-card p-4">
        <h2>Please login to view your member dashboard.</h2>
        <RouterLink class="btn btn-accent" to="/login">Login</RouterLink>
      </div>

      <div v-else class="row g-4">
        <div class="col-lg-4">
          <div class="content-card p-3 h-100">
            <p class="eyebrow mb-2">Account</p>
            <h2>{{ store.state.currentUser.name }}</h2>
            <p class="text-secondary mb-1">{{ store.state.currentUser.email }}</p>
            <p class="mb-0">Role: <strong>{{ store.state.currentUser.role }}</strong></p>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="content-card p-3 h-100">
            <h2 class="h4">Member actions</h2>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <RouterLink class="btn btn-dark" to="/submit-game">Submit a game</RouterLink>
              <RouterLink class="btn btn-outline-dark" to="/admin">Manage catalogue</RouterLink>
              <RouterLink class="btn btn-outline-dark" to="/reviews">View reviews</RouterLink>
            </div>
            <h3 class="h5">Your reviews</h3>
            <p v-if="myReviews.length === 0" class="text-secondary mb-0">No reviews yet.</p>
            <ul v-else class="mb-0">
              <li v-for="review in myReviews" :key="review.id">{{ review.comment }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
