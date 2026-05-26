<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

import {
  DEFAULT_TOURNAMENT_STATE,
  SEASON_NUMBER,
  SEASON_RANGE,
  SEASON_RESULTS,
  SEASON_SCHEDULE,
  SEASON_STANDINGS,
  calculatePlayerScore,
  createDefaultTournamentState,
  formatTimer,
  type BlindLevel,
  type ScoreRow,
  type TournamentState,
} from './poker'

const route = useRoute()

const tournament = reactive<TournamentState>(createDefaultTournamentState())
const scoreRows = ref<ScoreRow[]>(createLocalScoreRows())
const showBlindEditor = ref(false)
let timerId: number | undefined

const isHomePage = computed(() => route.path === '/')
const isTournamentPage = computed(() => route.path === '/tournament')
const isLocalPage = computed(() => route.path === '/local')
const currentLevel = computed(
  () => tournament.blindLevels[tournament.levelIndex] ?? DEFAULT_TOURNAMENT_STATE.blindLevels[0]!,
)
const nextLevel = computed(() => tournament.blindLevels[tournament.levelIndex + 1] ?? null)
const nextPokerNight = computed(() => SEASON_SCHEDULE.find((night) => night.isNext) ?? null)
const timerLabel = computed(() => formatTimer(tournament.secondsRemaining))
const totalPrizePoints = computed(() =>
  scoreRows.value.reduce((total, row) => total + calculatePlayerScore(row), 0),
)

const syncTimerToLevel = () => {
  tournament.secondsRemaining = currentLevel.value.durationMinutes * 60
}

const toggleTimer = () => {
  tournament.isRunning = !tournament.isRunning
}

const advanceLevel = () => {
  if (tournament.levelIndex < tournament.blindLevels.length - 1) {
    tournament.levelIndex += 1
    syncTimerToLevel()
    return
  }

  tournament.isRunning = false
  tournament.secondsRemaining = 0
}

const resetCurrentLevel = () => {
  tournament.isRunning = false
  syncTimerToLevel()
}

const addBlindLevel = () => {
  const previous = tournament.blindLevels[tournament.blindLevels.length - 1] ?? currentLevel.value

  tournament.blindLevels.push({
    smallBlind: previous.smallBlind * 2,
    bigBlind: previous.bigBlind * 2,
    durationMinutes: previous.durationMinutes,
  })
}

const removeBlindLevel = (index: number) => {
  if (tournament.blindLevels.length === 1) return

  tournament.blindLevels.splice(index, 1)
  tournament.levelIndex = Math.min(tournament.levelIndex, tournament.blindLevels.length - 1)
  syncTimerToLevel()
}

const updateBlindLevel = <K extends keyof BlindLevel>(
  index: number,
  field: K,
  value: BlindLevel[K],
) => {
  const level = tournament.blindLevels[index]
  if (!level) return

  level[field] = Math.max(1, Number(value)) as BlindLevel[K]

  if (index === tournament.levelIndex && field === 'durationMinutes' && !tournament.isRunning) {
    syncTimerToLevel()
  }
}

const addParticipant = () => {
  scoreRows.value.push({ name: '', placement: null, kills: 0, hosted: false })
}

const removeParticipant = (index: number) => {
  scoreRows.value.splice(index, 1)
}

const resetTournamentAndBlinds = () => {
  Object.assign(tournament, createDefaultTournamentState())
}

onMounted(() => {
  timerId = window.setInterval(() => {
    if (!tournament.isRunning) return

    if (tournament.secondsRemaining > 0) {
      tournament.secondsRemaining -= 1
      return
    }

    advanceLevel()
  }, 1000)
})

onUnmounted(() => {
  if (timerId) window.clearInterval(timerId)
})
</script>

<template>
  <main class="app-shell">
    <section class="hero card">
      <div>
        <p class="eyebrow">Season {{ SEASON_NUMBER }} poker stats</p>
        <h1>Season {{ SEASON_NUMBER }}</h1>
        <p class="hero-copy">
          Season {{ SEASON_NUMBER }} runs from {{ SEASON_RANGE }}. Rankings now include the March,
          April, and May poker night results.
        </p>
        <p v-if="nextPokerNight" class="next-game-callout">
          Next poker game: <strong>{{ nextPokerNight.host }}</strong> hosts on
          {{ nextPokerNight.dateLabel }}.
        </p>
      </div>
      <div class="hero-actions">
        <RouterLink v-if="!isHomePage" class="nav-button ghost-button" to="/">
          Main page
        </RouterLink>
        <RouterLink class="nav-button" to="/tournament">Tournament mode</RouterLink>
        <RouterLink class="nav-button" to="/local">Local mode</RouterLink>
      </div>
    </section>

    <template v-if="isHomePage">
      <section class="grid align-start">
        <div class="card standings-card">
          <p class="eyebrow">Rankings & standings</p>
          <h2>Season {{ SEASON_NUMBER }} standings</h2>
          <div class="standings-list">
            <div class="standings-header">
              <span>Participant</span>
              <span>Points</span>
            </div>
            <div v-for="standing in SEASON_STANDINGS" :key="standing.name" class="standings-row">
              <strong>{{ standing.name }}</strong>
              <span>{{ standing.points }}</span>
            </div>
          </div>

          <div class="monthly-results">
            <h3>Monthly results added</h3>
            <div v-for="month in SEASON_RESULTS" :key="month.month" class="monthly-result-card">
              <strong>{{ month.month }}</strong>
              <ul>
                <li v-for="entry in month.entries" :key="`${month.month}-${entry.name}`">
                  <span>{{ entry.placementLabel }} {{ entry.name }}</span>
                  <span>{{ entry.points }} pt{{ entry.points === 1 ? '' : 's' }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="standings-points-rules">
            <h3>Points rules</h3>
            <ul>
              <li>1st = 5 points</li>
              <li>2nd = 4 points</li>
              <li>3rd = 3 points</li>
              <li>4th = 2 points</li>
              <li>5th onwards = 1 point</li>
              <li>Host = 1 point</li>
              <li>Kill point = 1 point each</li>
            </ul>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="isTournamentPage">
      <section class="card tournament-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Tournament mode</p>
            <h2>{{ tournament.title }}</h2>
          </div>
          <input v-model="tournament.title" class="title-input" aria-label="Tournament title" />
        </div>

        <div class="timer-panel">
          <p>Level {{ tournament.levelIndex + 1 }} / {{ tournament.blindLevels.length }}</p>
          <strong>{{ timerLabel }}</strong>
          <span>{{ currentLevel.smallBlind }} / {{ currentLevel.bigBlind }} blinds</span>
          <small v-if="nextLevel"> Next: {{ nextLevel.smallBlind }} / {{ nextLevel.bigBlind }} </small>
          <small v-else>Final blind level</small>
        </div>

        <div class="button-row">
          <button type="button" @click="toggleTimer">{{ tournament.isRunning ? 'Pause' : 'Start' }}</button>
          <button type="button" @click="resetCurrentLevel">Reset level</button>
          <button type="button" @click="advanceLevel">Next level</button>
          <button type="button" @click="showBlindEditor = !showBlindEditor">
            {{ showBlindEditor ? 'Hide blinds' : 'Edit blinds' }}
          </button>
          <button type="button" class="danger-button" @click="resetTournamentAndBlinds">
            Reset timer & clear blinds
          </button>
        </div>
      </section>

      <section v-if="showBlindEditor" class="card">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Editable blind schedule</p>
            <h2>Blinds</h2>
          </div>
          <button type="button" @click="addBlindLevel">Add level</button>
        </div>

        <div class="schedule-list">
          <div v-for="(level, index) in tournament.blindLevels" :key="index" class="schedule-row">
            <span>Level {{ index + 1 }}</span>
            <label>
              Small blind
              <input
                :value="level.smallBlind"
                min="1"
                type="number"
                @input="updateBlindLevel(index, 'smallBlind', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <label>
              Big blind
              <input
                :value="level.bigBlind"
                min="1"
                type="number"
                @input="updateBlindLevel(index, 'bigBlind', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <label>
              Minutes
              <input
                :value="level.durationMinutes"
                min="1"
                type="number"
                @input="updateBlindLevel(index, 'durationMinutes', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <button type="button" class="danger-button" @click="removeBlindLevel(index)">Remove</button>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="isLocalPage">
      <section class="card">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Editable participants</p>
            <h2>Add participants</h2>
          </div>
          <button type="button" @click="addParticipant">Add participant</button>
        </div>

        <div class="score-table">
          <div class="score-header">
            <span>Player</span>
            <span>Place</span>
            <span>Kills</span>
            <span>Host</span>
            <span>Total</span>
            <span></span>
          </div>
          <div v-for="(row, index) in scoreRows" :key="`${row.name}-${index}`" class="score-row">
            <input v-model="row.name" aria-label="Participant name" />
            <input v-model.number="row.placement" min="1" placeholder="-" type="number" />
            <input v-model.number="row.kills" min="0" type="number" />
            <input v-model="row.hosted" type="checkbox" />
            <strong>{{ calculatePlayerScore(row) }}</strong>
            <button type="button" class="danger-button" @click="removeParticipant(index)">Remove</button>
          </div>
        </div>
        <p class="muted-copy participants-note">
          Participant edits stay local to the current page view. Main standings use the saved Season 20
          results.
        </p>
        <strong>{{ totalPrizePoints }} editable-entry points</strong>
      </section>
    </template>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(:root) {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-feature-settings: 'cv01', 'ss03';
}

:global(body) {
  margin: 0;
  min-width: 320px;
  color: #f7f8f8;
  background:
    radial-gradient(circle at 12% -10%, rgba(129, 140, 248, 0.3), transparent 28rem),
    radial-gradient(circle at 88% 8%, rgba(168, 85, 247, 0.22), transparent 25rem),
    radial-gradient(circle at 48% 102%, rgba(245, 158, 11, 0.14), transparent 30rem),
    linear-gradient(145deg, #050608 0%, #0a0d12 48%, #120b17 100%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

button,
input,
.nav-button {
  font: inherit;
}

button,
.nav-button {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 0.72rem 1.05rem;
  color: #ffffff;
  background: linear-gradient(135deg, #6d5dfc 0%, #8b5cf6 52%, #c084fc 100%);
  box-shadow:
    0 14px 32px rgba(109, 93, 252, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

button:hover,
.nav-button:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    0 18px 40px rgba(109, 93, 252, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.95rem;
  padding: 0.7rem 0.8rem;
  color: #f7f8f8;
  background: rgba(6, 8, 12, 0.72);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

input:focus {
  border-color: rgba(129, 140, 248, 0.75);
  background: rgba(10, 13, 18, 0.92);
  box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.13);
}

.app-shell {
  position: relative;
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.app-shell::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: '';
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.75), transparent 78%);
}

.card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 1.55rem;
  padding: 1.25rem;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035)),
    rgba(8, 10, 15, 0.78);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(22px);
}

.card::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: radial-gradient(circle at top right, rgba(129, 140, 248, 0.12), transparent 20rem);
}

.card > * {
  position: relative;
  z-index: 1;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: clamp(1.35rem, 3vw, 2rem);
}

.hero::after {
  background:
    radial-gradient(circle at 85% 20%, rgba(196, 181, 253, 0.22), transparent 18rem),
    radial-gradient(circle at 18% 85%, rgba(139, 92, 246, 0.16), transparent 18rem);
}

.hero-actions {
  display: grid;
  gap: 0.75rem;
  min-width: 190px;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 740px;
  margin-bottom: 0.7rem;
  color: #ffffff;
  font-size: clamp(2.3rem, 7vw, 5.2rem);
  font-weight: 800;
  letter-spacing: -0.07em;
  line-height: 0.92;
  text-shadow: 0 16px 48px rgba(129, 140, 248, 0.16);
}

h2 {
  margin-bottom: 0.35rem;
  color: #f7f8f8;
  font-size: clamp(1.45rem, 2.4vw, 2rem);
  letter-spacing: -0.035em;
}

h3 {
  color: #f7f8f8;
}

.hero-copy,
.muted-copy {
  max-width: 720px;
  color: #b8c0cc;
  font-size: 1.08rem;
  line-height: 1.65;
}

.next-game-callout {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0;
  border: 1px solid rgba(168, 85, 247, 0.38);
  border-radius: 999px;
  padding: 0.68rem 0.95rem;
  color: #ede9fe;
  background: rgba(139, 92, 246, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.eyebrow {
  margin-bottom: 0.35rem;
  color: #a5b4fc;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.two-column {
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
}

.align-start {
  align-items: start;
}

.section-heading {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 340px);
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.section-heading.compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timer-panel {
  display: grid;
  place-items: center;
  min-height: 250px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 1.35rem;
  padding: 1.25rem;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.14), transparent 16rem),
    linear-gradient(135deg, rgba(109, 93, 252, 0.3), rgba(168, 85, 247, 0.18));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.timer-panel p,
.timer-panel small {
  color: #c4cad5;
}

.timer-panel strong {
  color: #ffffff;
  font-size: clamp(4rem, 14vw, 8rem);
  letter-spacing: -0.08em;
  line-height: 0.9;
}

.timer-panel span {
  color: #ede9fe;
  font-size: 1.4rem;
  font-weight: 800;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1rem;
}

.ghost-button,
.danger-button {
  color: #f7f8f8;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09);
}

.danger-button {
  color: #fecdd3;
  border-color: rgba(244, 63, 94, 0.22);
}

.rules-card ul,
.standings-points-rules ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.2rem;
  color: #d7dde7;
}

.season-schedule {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.season-schedule li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 1rem;
  padding: 0.78rem;
  color: #d7dde7;
  background: rgba(255, 255, 255, 0.045);
}

.season-schedule .next-night {
  color: #f5f3ff;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.24), rgba(129, 140, 248, 0.14));
  border-color: rgba(168, 85, 247, 0.32);
}

.monthly-results,
.standings-points-rules {
  margin-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1rem;
}

.monthly-results {
  display: grid;
  gap: 0.75rem;
}

.monthly-results h3,
.standings-points-rules h3 {
  margin: 0 0 0.7rem;
}

.monthly-result-card {
  display: grid;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 1rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
}

.monthly-result-card ul {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  color: #d7dde7;
  list-style: none;
}

.monthly-result-card li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
}

.schedule-list,
.score-table,
.standings-list {
  display: grid;
  gap: 0.7rem;
}

.schedule-row,
.score-header,
.score-row,
.standings-header,
.standings-row {
  display: grid;
  gap: 0.65rem;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 1rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.045);
}

.schedule-row {
  grid-template-columns: 90px repeat(3, minmax(120px, 1fr)) auto;
}

.schedule-row label {
  display: grid;
  gap: 0.35rem;
  color: #b8c0cc;
  font-size: 0.83rem;
}

.score-header,
.score-row {
  grid-template-columns: 1.2fr 0.75fr 0.75fr 0.55fr 0.6fr auto;
}

.standings-header,
.standings-row {
  grid-template-columns: 1fr auto;
}

.score-header,
.standings-header {
  color: #a5b4fc;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.score-row input[type='checkbox'] {
  width: 1.35rem;
  height: 1.35rem;
  accent-color: #8b5cf6;
}

.participants-note {
  margin-top: 1rem;
}

@media (max-width: 860px) {
  .hero,
  .section-heading,
  .section-heading.compact {
    display: grid;
    align-items: stretch;
  }

  .two-column,
  .schedule-row,
  .score-header,
  .score-row {
    grid-template-columns: 1fr;
  }
}
</style>
