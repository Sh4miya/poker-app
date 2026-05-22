<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import {
  DEFAULT_TOURNAMENT_STATE,
  calculatePlayerScore,
  clearTournamentState,
  createDefaultScoreRows,
  formatTimer,
  loadTournamentState,
  saveTournamentState,
  type BlindLevel,
  type ScoreRow,
  type TournamentState,
} from './poker'

const makeTournamentState = (): TournamentState => {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_TOURNAMENT_STATE)

  return loadTournamentState(window.sessionStorage)
}

const tournament = reactive<TournamentState>(makeTournamentState())
const scoreRows = ref<ScoreRow[]>(createDefaultScoreRows())
let timerId: number | undefined

const currentLevel = computed(
  () => tournament.blindLevels[tournament.levelIndex] ?? DEFAULT_TOURNAMENT_STATE.blindLevels[0]!,
)
const nextLevel = computed(() => tournament.blindLevels[tournament.levelIndex + 1] ?? null)
const timerLabel = computed(() => formatTimer(tournament.secondsRemaining))
const leaderboard = computed(() =>
  scoreRows.value
    .map((row) => ({ ...row, score: calculatePlayerScore(row) }))
    .sort((a, b) => b.score - a.score || (a.placement ?? 99) - (b.placement ?? 99)),
)
const totalPrizePoints = computed(() => leaderboard.value.reduce((total, row) => total + row.score, 0))

const persistTournament = () => {
  if (typeof window !== 'undefined') saveTournamentState(window.sessionStorage, tournament)
}

watch(tournament, persistTournament, { deep: true })

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

const resetSessionData = () => {
  Object.assign(tournament, structuredClone(DEFAULT_TOURNAMENT_STATE))
  scoreRows.value = createDefaultScoreRows()

  if (typeof window !== 'undefined') clearTournamentState(window.sessionStorage)
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
        <p class="eyebrow">Poker stats</p>
        <h1>No login. Just the scoreboard.</h1>
        <p class="hero-copy">
          Track tournament blinds, placements, hosts, and kill points for the current session.
          Tournament settings live in session storage and can be cleared any time.
        </p>
      </div>
      <button class="ghost-button" type="button" @click="resetSessionData">Clear session data</button>
    </section>

    <section class="grid two-column">
      <div class="card tournament-card">
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
          <small v-if="nextLevel">
            Next: {{ nextLevel.smallBlind }} / {{ nextLevel.bigBlind }}
          </small>
          <small v-else>Final blind level</small>
        </div>

        <div class="button-row">
          <button type="button" @click="toggleTimer">{{ tournament.isRunning ? 'Pause' : 'Start' }}</button>
          <button type="button" @click="resetCurrentLevel">Reset level</button>
          <button type="button" @click="advanceLevel">Next level</button>
        </div>
      </div>

      <div class="card rules-card">
        <p class="eyebrow">Points rules</p>
        <ul>
          <li>1st = 5 points</li>
          <li>2nd = 4 points</li>
          <li>3rd = 3 points</li>
          <li>4th = 2 points</li>
          <li>5th onwards = 1 point</li>
          <li>Host = 1 point</li>
          <li>Kill point = 1 point each</li>
        </ul>
        <strong>{{ totalPrizePoints }} total points entered</strong>
      </div>
    </section>

    <section class="card">
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

    <section class="grid two-column align-start">
      <div class="card">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Points table</p>
            <h2>Participants</h2>
          </div>
        </div>

        <div class="score-table">
          <div class="score-header">
            <span>Player</span>
            <span>Place</span>
            <span>Kills</span>
            <span>Host</span>
            <span>Total</span>
          </div>
          <div v-for="row in scoreRows" :key="row.name" class="score-row">
            <strong>{{ row.name }}</strong>
            <input v-model.number="row.placement" min="1" placeholder="-" type="number" />
            <input v-model.number="row.kills" min="0" type="number" />
            <input v-model="row.hosted" type="checkbox" />
            <strong>{{ calculatePlayerScore(row) }}</strong>
          </div>
        </div>
      </div>

      <div class="card leaderboard-card">
        <p class="eyebrow">Live leaderboard</p>
        <ol>
          <li v-for="row in leaderboard" :key="row.name">
            <span>{{ row.name }}</span>
            <strong>{{ row.score }}</strong>
          </li>
        </ol>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  min-width: 320px;
  color: #f8fafc;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.35), transparent 32rem),
    linear-gradient(135deg, #08111f 0%, #111827 48%, #1f1018 100%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  color: #07111f;
  background: #86efac;
  font-weight: 800;
}

input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.85rem;
  padding: 0.65rem 0.75rem;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.82);
}

.app-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1.5rem;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(20px);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  max-width: 740px;
  margin-bottom: 0.7rem;
  font-size: clamp(2.2rem, 7vw, 5rem);
  line-height: 0.94;
}

h2 {
  margin-bottom: 0.35rem;
}

.hero-copy {
  max-width: 720px;
  color: #cbd5e1;
  font-size: 1.08rem;
}

.eyebrow {
  margin-bottom: 0.35rem;
  color: #86efac;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.14em;
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
  border-radius: 1.3rem;
  padding: 1.25rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(59, 130, 246, 0.15));
}

.timer-panel strong {
  font-size: clamp(4rem, 14vw, 8rem);
  line-height: 0.9;
}

.timer-panel span {
  color: #bbf7d0;
  font-size: 1.4rem;
  font-weight: 900;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1rem;
}

.ghost-button,
.danger-button {
  color: #f8fafc;
  background: rgba(148, 163, 184, 0.16);
}

.danger-button {
  color: #fecaca;
}

.rules-card ul {
  display: grid;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding-left: 1.2rem;
  color: #e2e8f0;
}

.schedule-list,
.score-table,
.leaderboard-card ol {
  display: grid;
  gap: 0.7rem;
}

.schedule-row,
.score-header,
.score-row,
.leaderboard-card li {
  display: grid;
  gap: 0.65rem;
  align-items: center;
  border-radius: 1rem;
  padding: 0.85rem;
  background: rgba(15, 23, 42, 0.65);
}

.schedule-row {
  grid-template-columns: 90px repeat(3, minmax(120px, 1fr)) auto;
}

.schedule-row label {
  display: grid;
  gap: 0.35rem;
  color: #cbd5e1;
  font-size: 0.83rem;
}

.score-header,
.score-row {
  grid-template-columns: 1.2fr 0.75fr 0.75fr 0.55fr 0.6fr;
}

.score-header {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.score-row input[type='checkbox'] {
  width: 1.35rem;
  height: 1.35rem;
}

.leaderboard-card ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.leaderboard-card li {
  grid-template-columns: 1fr auto;
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
