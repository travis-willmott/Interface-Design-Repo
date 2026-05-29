<script setup>
import { computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

// ==================== DATA AGGREGATION ====================

// Game popularity statistics (number of reviews per game)
const gamePopularity = computed(() => {
  const stats = {}

  store.state.reviews.forEach((review) => {
    const gameId = review.gameId
    if (!stats[gameId]) {
      const game = store.state.games.find((g) => g.id === gameId)
      stats[gameId] = {
        gameId,
        title: game?.title || 'Removed Game',
        slug: game?.slug,
        reviewCount: 0,
        totalRating: 0,
        averageRating: 0,
      }
    }
    stats[gameId].reviewCount++
    stats[gameId].totalRating += review.score
  })

  // Calculate averages
  Object.keys(stats).forEach((key) => {
  const stat = stats[key]
  const avg = stat.totalRating / stat.reviewCount

  stat.averageRating = Number.isInteger(avg)
    ? avg.toString()
    : avg.toFixed(1)
})

  return stats
})

// Most reviewed games (sorted by review count)
const mostReviewedGames = computed(() => { return Object.values(gamePopularity.value) .sort((a, b) => b.reviewCount - a.reviewCount) .slice(0, 10) })

// Highest rated games (with minimum 2 reviews to be fair)
const highestRatedGames = computed(() => {
  return Object.values(gamePopularity.value)
    .filter((game) => game.reviewCount >= 2)
    .sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating))
    .slice(0, 10)
})

// Lowest rated games (with minimum 2 reviews)
const lowestRatedGames = computed(() => {
  return Object.values(gamePopularity.value)
    .filter((game) => game.reviewCount >= 2)
    .sort((a, b) => parseFloat(a.averageRating) - parseFloat(b.averageRating))
    .slice(0, 5)
})

// ==================== RATING DISTRIBUTION ====================

// Overall rating distribution across all reviews
const ratingDistribution = computed(() => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

  store.state.reviews.forEach((review) => {
    const score = Number(review.score)

    if (distribution[score] !== undefined) {
      distribution[score]++
    }
  })

  return distribution
})

// Calculate percentages
const ratingDistributionPercentages = computed(() => {
  const total = store.state.reviews.length
  if (total === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

  return {
    5: ((ratingDistribution.value[5] / total) * 100).toFixed(1),
    4: ((ratingDistribution.value[4] / total) * 100).toFixed(1),
    3: ((ratingDistribution.value[3] / total) * 100).toFixed(1),
    2: ((ratingDistribution.value[2] / total) * 100).toFixed(1),
    1: ((ratingDistribution.value[1] / total) * 100).toFixed(1),
  }
})

// ==================== RATING TRENDS ====================

// Average rating trend (by rating score)
const ratingTrends = computed(() => {
  return [
    {
      score: 5,
      count: ratingDistribution.value[5],
      percentage: ratingDistributionPercentages.value[5],
      label: '⭐⭐⭐⭐⭐',
    },
    {
      score: 4,
      count: ratingDistribution.value[4],
      percentage: ratingDistributionPercentages.value[4],
      label: '⭐⭐⭐⭐  ',
    },
    {
      score: 3,
      count: ratingDistribution.value[3],
      percentage: ratingDistributionPercentages.value[3],
      label: '⭐⭐⭐    ',
    },
    {
      score: 2,
      count: ratingDistribution.value[2],
      percentage: ratingDistributionPercentages.value[2],
      label: '⭐⭐      ',
    },
    {
      score: 1,
      count: ratingDistribution.value[1],
      percentage: ratingDistributionPercentages.value[1],
      label: '⭐          ',
    },
  ]
})

// ==================== ENGAGEMENT METRICS ====================

// Overall statistics
const overallStats = computed(() => {
  const reviews = store.state.reviews
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      totalGames: 0,
      reviewedGames: 0,
      reviewsPerGame: 0,
    }
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.score, 0)
  const avgRating = (totalRating / reviews.length).toFixed(2)
  const reviewedGames = Object.keys(gamePopularity.value).length
  const reviewsPerGame = (reviews.length / reviewedGames).toFixed(1)

  return {
    totalReviews: reviews.length,
    averageRating: parseFloat(avgRating),
    totalGames: store.state.games.length,
    reviewedGames,
    reviewsPerGame,
  }
})

// ==================== TRENDING GAMES ====================

// Trending games (most recent reviews)
const trendingGames = computed(() => {
  const gameReviewDates = {}

  store.state.reviews.forEach((review) => {
    const gameId = review.gameId
    if (!gameReviewDates[gameId]) {
      const game = store.state.games.find((g) => g.id === gameId)
      gameReviewDates[gameId] = {
        gameId,
        title: game?.title || 'Removed Game',
        slug: game?.slug,
        lastReviewIndex: 0,
        recentReviewCount: 0,
      }
    }
    gameReviewDates[gameId].lastReviewIndex = store.state.reviews.indexOf(review)
    gameReviewDates[gameId].recentReviewCount++
  })

  return Object.values(gameReviewDates)
    .sort((a, b) => b.lastReviewIndex - a.lastReviewIndex)
    .slice(0, 10)
})

// ==================== CHART VISUALIZATION HELPERS ====================

// Get bar width percentage for charts
const getBarWidth = (value, maxValue) => {
  if (maxValue === 0) return 0
  return (value / maxValue) * 100
}

// Get max review count for scaling
const maxReviewCount = computed(() => {
  if (mostReviewedGames.value.length === 0) return 1
  return mostReviewedGames.value[0].reviewCount
})

// Rating color helper
const getRatingColor = (rating) => {
  const num = parseFloat(rating)
  if (num >= 4.5) return '#7fbf9f'
  if (num >= 3.5) return '#8ecae6'
  if (num >= 2.5) return '#e9c46a'

  return '#d98c8c'
}

// ==================== HELPER FUNCTIONS ====================

const getStarDisplay = (score) => {
  return '⭐'.repeat(score) + '☆'.repeat(5 - score)
}

const formatPercentage = (value) => {
  return parseFloat(value).toFixed(1)
}
</script>

<template>
  <PageHeader
    title="Analytics Dashboard"
    text="Comprehensive analytics and insights about game reviews, ratings, and community engagement. Track trends and discover the most popular and highest-rated games."
  />

  <!-- Overall Statistics Section -->
  <section class="section-band bg-light">
    <div class="container">
      <h3 class="mb-4"> Overall Statistics</h3>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="stat-card">
            <p class="stat-label">Total Reviews</p>
            <p class="stat-value">{{ overallStats.totalReviews }}</p>
            <p class="stat-description">Community reviews submitted</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <p class="stat-label">Average Rating</p>
            <p class="stat-value">{{ overallStats.averageRating }}/5</p>
            <p class="stat-description">{{ getStarDisplay(Math.round(overallStats.averageRating)) }}</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <p class="stat-label">Games Reviewed</p>
            <p class="stat-value">{{ overallStats.reviewedGames }}/{{ overallStats.totalGames }}</p>
            <p class="stat-description">{{ formatPercentage((overallStats.reviewedGames / overallStats.totalGames) * 100) }}% of catalog</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Most Reviewed Games -->
  <!-- Most Reviewed Games --> <section class="section-band"> <div class="container"> <h3 class="mb-4"> Most Reviewed Games</h3> <div v-if="mostReviewedGames.length === 0" class="alert alert-info"> No reviews yet. Be the first to review a game! </div> <div v-else class="chart-container"> <div v-for="game in mostReviewedGames" :key="game.gameId" class="chart-row mb-4" > <div class="chart-label"> <RouterLink :to="`/games/${game.slug}`" class="plain-game-link"> {{ game.title }} </RouterLink> </div> <div class="chart-bar-container"> <div class="chart-bar" :style="{ width: getBarWidth(game.reviewCount, maxReviewCount) + '%' }" ></div> </div> <span class="review-count"> {{ game.reviewCount }} reviews </span> </div> </div> </div> </section>

  <!-- Highest Rated Games -->
  <section class="section-band bg-light">
    <div class="container">
      <h3 class="mb-4"> Highest Rated Games</h3>
      <div v-if="highestRatedGames.length === 0" class="alert alert-info">
        Not enough reviews to calculate ratings.
      </div>
      <div v-else class="row g-3">
        <div v-for="game in highestRatedGames" :key="game.gameId" class="col-md-6 col-lg-4">
          <div class="rating-card">
            <div class="rating-header">
              <h5 class="mb-1">
                <RouterLink :to="`/games/${game.slug}`" class="plain-game-link">
                  {{ game.title }}
                </RouterLink>
              </h5>
              <p class="text-warning mb-0">{{ getStarDisplay(Math.round(parseFloat(game.averageRating))) }}</p>
            </div>
            <div class="rating-stats">
              <div class="rating-score">
                {{ game.averageRating }}/5
              </div>
              <p class="text-secondary small">Based on {{ game.reviewCount }} reviews</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Rating Distribution -->
  <section class="section-band">
    <div class="container">
      <h3 class="mb-4"> Rating Distribution (All Games)</h3>
      <div class="row g-4">
        <div class="col-lg-6">
          <div class="distribution-list">
            <div v-for="trend in ratingTrends" :key="trend.score" class="distribution-row mb-3">
              <div class="distribution-label">{{ trend.label }}</div>
              <div class="distribution-bar-container">
                <div
                  class="distribution-bar"
                  :style="{
                    width: trend.percentage + '%',
                    backgroundColor: getRatingColor(trend.score),
                  }"
                ></div>
              </div>
              <div class="distribution-info">
                <span class="distribution-count">{{ trend.count }}</span>
                <span class="distribution-percent">({{ trend.percentage }}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pie Chart Representation -->
        <!-- Pie Chart Representation -->
<div class="col-lg-6">
  <div class="pie-chart-container">

    <svg viewBox="0 0 42 42" class="pie-chart donut-chart">

      <!-- Background ring -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        stroke="#e9ecef"
        stroke-width="3"
      />

      <!-- 5 Stars -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        :stroke="getRatingColor(5)"
        stroke-width="3"
        :stroke-dasharray="`${ratingDistributionPercentages[5]} ${100 - ratingDistributionPercentages[5]}`"
        stroke-dashoffset="25"
      />

      <!-- 4 Stars -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        :stroke="getRatingColor(4)"
        stroke-width="3"
        :stroke-dasharray="`${ratingDistributionPercentages[4]} ${100 - ratingDistributionPercentages[4]}`"
        :stroke-dashoffset="25 - ratingDistributionPercentages[5]"
      />

      <!-- 3 Stars -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        :stroke="getRatingColor(3)"
        stroke-width="3"
        :stroke-dasharray="`${ratingDistributionPercentages[3]} ${100 - ratingDistributionPercentages[3]}`"
        :stroke-dashoffset="
          25 -
          ratingDistributionPercentages[5] -
          ratingDistributionPercentages[4]
        "
      />

      <!-- 2 Stars -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        :stroke="getRatingColor(2)"
        stroke-width="3"
        :stroke-dasharray="`${ratingDistributionPercentages[2]} ${100 - ratingDistributionPercentages[2]}`"
        :stroke-dashoffset="
          25 -
          ratingDistributionPercentages[5] -
          ratingDistributionPercentages[4] -
          ratingDistributionPercentages[3]
        "
      />

      <!-- 1 Star -->
      <circle
        cx="21"
        cy="21"
        r="15.915"
        fill="transparent"
        :stroke="getRatingColor(1)"
        stroke-width="3"
        :stroke-dasharray="`${ratingDistributionPercentages[1]} ${100 - ratingDistributionPercentages[1]}`"
        :stroke-dashoffset="
          25 -
          ratingDistributionPercentages[5] -
          ratingDistributionPercentages[4] -
          ratingDistributionPercentages[3] -
          ratingDistributionPercentages[2]
        "
      />

      <!-- Center Text -->
      <text
        x="21"
        y="20"
        text-anchor="middle"
        font-size="2.5"
        fill="#6c757d"
      >
        Reviews
      </text>

      <text
        x="21"
        y="24"
        text-anchor="middle"
        font-size="4"
        font-weight="bold"
        fill="#212529"
      >
        {{ overallStats.totalReviews }}
      </text>

    </svg>

    <!-- Legend -->
    <div class="pie-legend">
      <div
        v-for="trend in ratingTrends"
        :key="trend.score"
        class="legend-item"
      >
        <span
          class="legend-color"
          :style="{ backgroundColor: getRatingColor(trend.score) }"
        ></span>

        <span>
          {{ trend.label }} :
          {{ trend.percentage }}%
          ({{ trend.count }})
        </span>
      </div>
    </div>

  </div>
</div>
      </div>
    </div>
  </section>

  <!-- Trending Games (Most Recent Activity) -->
  <section class="section-band bg-light">
    <div class="container">
      <h3 class="mb-4"> Trending (Recent Activity)</h3>
      <div v-if="trendingGames.length === 0" class="alert alert-info">
        No review activity yet.
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Game Title</th>
              <th>Recent Reviews</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(game, index) in trendingGames" :key="game.gameId">
              <td><strong>{{ index + 1 }}</strong></td>
              <td>
                <RouterLink :to="`/games/${game.slug}`" class="plain-game-link">
                  {{ game.title }}
                </RouterLink>
              </td>
              <td><span class="plain-text-count">{{ game.recentReviewCount }}</span></td>
              <td>
                <RouterLink :to="`/games/${game.slug}`" class="btn btn-sm btn-outline-primary">
                  View
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Games Needing Reviews -->
  <section class="section-band">
    <div class="container">
      <h3 class="mb-4"> Games Needing Reviews</h3>
      <div class="row g-3">
        <div
          v-for="game in store.state.games.filter((g) => !gamePopularity[g.id] || gamePopularity[g.id].reviewCount === 0)"
          :key="game.id"
          class="col-md-6 col-lg-4"
        >
          <div class="need-review-card">
            <h5>{{ game.title }}</h5>
            <p class="text-secondary small">No reviews yet</p>
            <RouterLink :to="`/games/${game.slug}`" class="btn btn-sm btn-primary">
              View & Review
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Detailed Game Analytics Table -->
  <section class="section-band bg-light">
    <div class="container">
      <h3 class="mb-4"> Detailed Game Analytics</h3>
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-light">
            <tr>
              <th>Game</th>
              <th class="text-center">Reviews</th>
              <th class="text-center">Avg Rating</th>
              <th class="text-center">Rating Stars</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in Object.values(gamePopularity).sort((a, b) => b.reviewCount - a.reviewCount)" :key="game.gameId">
              <td>
                <RouterLink :to="`/games/${game.slug}`" class="plain-game-link">
                  <strong>{{ game.title }}</strong>
                </RouterLink>
              </td>
              <td class="text-center"><span class="plain-text-count">{{ game.reviewCount }}</span></td>
              <td class="text-center">
  <span class="plain-rating">
    {{ game.averageRating }}/5
  </span>
</td>
              <td class="text-center">{{ getStarDisplay(Math.round(parseFloat(game.averageRating))) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-center mt-3 text-secondary">
        <small>Showing {{ Object.keys(gamePopularity).length }} reviewed games</small>
      </div>
    </div>
  </section>

  <!-- Analytics Tips
  <section class="section-band">
    <div class="container">
      <h3 class="mb-4">💡 Dashboard Tips</h3>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="tip-card">
            <h5> Track Popularity</h5>
            <p class="small text-secondary mb-0">
              Use the "Most Reviewed Games" chart to see which games are generating the most community engagement.
            </p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="tip-card">
            <h5> Find Quality Games</h5>
            <p class="small text-secondary mb-0">
              Check "Highest Rated Games" to discover community favorites. Requires at least 2 reviews for fairness.
            </p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="tip-card">
            <h5> Spot Trends</h5>
            <p class="small text-secondary mb-0">
              Monitor "Trending" section to see which games are getting the most recent activity and attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section> -->
</template>

<style scoped>
/* Overall Statistics Cards */
.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.stat-label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #0d6efd;
  margin: 0.5rem 0;
}

.stat-description {
  font-size: 0.875rem;
  color: #6c757d;
  margin: 0;
}

/* Chart Styling */
.chart-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chart-label {
  min-width: 200px;
  display: flex;
  align-items: center;
}

.plain-game-link {
  color: #212529;
  text-decoration: none;
  font-weight: 500;
}

.plain-game-link:hover {
  color: #212529;
  text-decoration: none;
}

.chart-bar-container {
  flex-grow: 1;
  height: 24px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  background: linear-gradient(90deg, #0d6efd, #0d6efd);
  transition: width 0.3s ease;
}

/* .chart-value {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: #212529;
} */

/* Rating Cards */
.rating-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.rating-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.rating-header h5 {
  margin-bottom: 0.5rem;
}

.rating-score {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.rating-stats {
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

/* Distribution Bars */
.distribution-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.distribution-label {
  min-width: 120px;
  font-size: 0.9rem;
  font-weight: 500;
}

.distribution-bar-container {
  flex-grow: 1;
  height: 30px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.distribution-info {
  min-width: 80px;
  text-align: right;
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}

.distribution-count {
  font-weight: 600;
  color: #212529;
}

.distribution-percent {
  color: #6c757d;
}

/* Pie Chart */
.pie-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pie-chart {
  width: 200px;
  height: 200px;
  margin-bottom: 1rem;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

/* Need Review Card */
.need-review-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 0.5px solid ;
  text-align: center;
  transition: all 0.3s ease;
}

.need-review-card:hover {
  border-color: #79afff;
  box-shadow: 0 2px 8px rgba(13, 110, 253, 0.15);
}

.need-review-card h5 {
  margin-bottom: 0.5rem;
}

/* Tip Card */
.tip-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #b6d3fd;
}

.tip-card h5 {
  color: #9bc1fc;
  margin-bottom: 0.75rem;
}

/* Section Band */
.section-band {
  padding: 3rem 0;
}

.section-band.bg-light {
  background-color: #f8f9fa;
}

/* Badge Styling */
.badge {
  padding: 0.4rem 0.75rem;
  font-weight: 600;
  border-radius: 20px;
}

/* Table Styling */
.table {
  margin-bottom: 0;
}

.table thead {
  background-color: #f8f9fa;
  font-weight: 600;
}

.table tbody tr {
  transition: background-color 0.2s ease;
}

.table tbody tr:hover {
  background-color: #f8f9fa;
}

/* Link Styling */
a {
  transition: color 0.2s ease;
}

a:hover {
  color: #d2e3fc;
}

/* Responsive Design */
@media (max-width: 768px) {
  .chart-label {
    min-width: 150px;
    font-size: 0.9rem;
  }

  .distribution-label {
    min-width: 100px;
    font-size: 0.8rem;
  }

  .stat-value {
    font-size: 2rem;
  }

  .rating-score {
    font-size: 1.5rem;
  }
  .review-count {
  color: #212529;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}
.plain-text-count {
  color: #212529;
  font-weight: 500;
}

.plain-rating {
  color: #212529;
  font-weight: 600;
}
}
</style>