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
  createLocalScoreRows,
  formatTimer,
  type BlindLevel,
  type ScoreRow,
  type TournamentState,
} from './poker'

const route = useRoute()

const tournament = reactive<TournamentState>(createDefaultTournamentState())
const scoreRows = ref<ScoreRow[]>(createLocalScoreRows())
const showBlindEditor = ref(false)
const timerPanel = ref<HTMLElement | null>(null)
const isTimerFullscreen = ref(false)
const visibleResultMonths = ref<Set<string>>(new Set())
let timerId: number | undefined

const isHomePage = computed(() => route.path === '/')
const isLivePage = computed(() => route.path === '/tournament')
const currentLevel = computed(
  () => tournament.blindLevels[tournament.levelIndex] ?? DEFAULT_TOURNAMENT_STATE.blindLevels[0]!,
)
const nextLevel = computed(() => tournament.blindLevels[tournament.levelIndex + 1] ?? null)
const nextPokerNight = computed(() => SEASON_SCHEDULE.find((night) => night.isNext) ?? null)
const timerLabel = computed(() => formatTimer(tournament.secondsRemaining))
const totalPrizePoints = computed(() =>
  scoreRows.value.reduce((total, row) => total + calculatePlayerScore(row), 0),
)

const toggleMonthResults = (month: string) => {
  const nextVisibleMonths = new Set(visibleResultMonths.value)

  if (nextVisibleMonths.has(month)) {
    nextVisibleMonths.delete(month)
  } else {
    nextVisibleMonths.add(month)
  }

  visibleResultMonths.value = nextVisibleMonths
}

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

const syncFullscreenState = () => {
  const panel = timerPanel.value

  isTimerFullscreen.value = Boolean(panel && document.fullscreenElement === panel)
}

const exitFullscreenIfNeeded = async (panel: HTMLElement) => {
  if (document.fullscreenElement === panel) {
    await document.exitFullscreen()
  }
}

const toggleTimerFullscreen = async () => {
  const panel = timerPanel.value
  if (!panel) return

  try {
    if (document.fullscreenElement === panel) {
      await exitFullscreenIfNeeded(panel)
    } else {
      await panel.requestFullscreen()
    }

    syncFullscreenState()
  } catch {
    syncFullscreenState()
  }
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

  document.addEventListener('fullscreenchange', syncFullscreenState)
  syncFullscreenState()
})

onUnmounted(() => {
  if (timerId) window.clearInterval(timerId)
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<template>
  <main class="app-shell">
    <section class="hero card">
      <div>
        <p class="eyebrow">Season {{ SEASON_NUMBER }} poker stats</p>
        <h1>Season {{ SEASON_NUMBER }}</h1>
        <p class="hero-copy">Season {{ SEASON_NUMBER }} runs from {{ SEASON_RANGE }}.</p>
        <p v-if="nextPokerNight" class="next-game-callout">
          Next poker game: <strong>{{ nextPokerNight.host }}</strong> on
          {{ nextPokerNight.dateLabel }}.
        </p>
      </div>
      <div class="hero-actions">
        <RouterLink v-if="!isHomePage" class="nav-button ghost-button" to="/">
          Rankings &amp; Standings
        </RouterLink>
        <RouterLink class="nav-button" to="/tournament">Tournament Mode</RouterLink>
      </div>
    </section>

    <template v-if="isHomePage">
      <section class="two-column align-start">
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
            <h3>Monthly results</h3>
            <div v-for="month in SEASON_RESULTS" :key="month.month" class="monthly-result-card">
              <div class="monthly-result-summary">
                <strong>{{ month.month }}</strong>
                <button
                  type="button"
                  class="ghost-button compact-button"
                  :aria-expanded="visibleResultMonths.has(month.month)"
                  @click="toggleMonthResults(month.month)"
                >
                  {{ visibleResultMonths.has(month.month) ? 'Hide placings' : 'Show placings' }}
                </button>
              </div>
              <ul v-if="visibleResultMonths.has(month.month)">
                <li v-for="entry in month.entries" :key="`${month.month}-${entry.name}`">
                  <span
                    >{{ entry.placementLabel }} {{ entry.name
                    }}{{ entry.hosted ? ' (host)' : '' }}</span
                  >
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

        <div class="card schedule-card">
          <p class="eyebrow">Season schedule</p>
          <h2>Host Calendar</h2>
          <ul class="season-schedule">
            <li
              v-for="night in SEASON_SCHEDULE"
              :key="night.dateLabel"
              :class="{ 'next-night': night.isNext }"
            >
              <span>{{ night.dateLabel }}</span>
              <strong>{{ night.host }}</strong>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <template v-else-if="isLivePage">
      <section class="live-workspace">
        <div class="live-main-column">
          <section class="card tournament-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Tournament Timer</p>
                <h2>{{ tournament.title }}</h2>
                <p class="muted-copy live-intro">
                  Keep the blind clock, current level, next blind, and player scoring in one view so
                  the host does not have to switch modes mid-game.
                </p>
              </div>
              <input v-model="tournament.title" class="title-input" aria-label="Tournament title" />
            </div>

            <div ref="timerPanel" class="timer-panel">
              <button
                type="button"
                class="ghost-button compact-button timer-fullscreen-button"
                :aria-pressed="isTimerFullscreen"
                @click="toggleTimerFullscreen"
              >
                {{ isTimerFullscreen ? 'Exit fullscreen' : 'Fullscreen timer' }}
              </button>
              <p>Level {{ tournament.levelIndex + 1 }} / {{ tournament.blindLevels.length }}</p>
              <strong>{{ timerLabel }}</strong>
              <span>{{ currentLevel.smallBlind }} / {{ currentLevel.bigBlind }} blinds</span>
              <small>{{ currentLevel.durationMinutes }} minute levels</small>
              <small v-if="nextLevel">
                Next: {{ nextLevel.smallBlind }} / {{ nextLevel.bigBlind }}
              </small>
              <small v-else>Final blind level</small>
            </div>

            <div class="button-row">
              <button type="button" @click="toggleTimer">
                {{ tournament.isRunning ? 'Pause clock' : 'Start clock' }}
              </button>
              <button type="button" @click="resetCurrentLevel">Reset level</button>
              <button type="button" @click="advanceLevel">Next level</button>
              <button type="button" @click="showBlindEditor = !showBlindEditor">
                {{ showBlindEditor ? 'Hide blind schedule' : 'Edit blind schedule' }}
              </button>
              <button type="button" class="danger-button" @click="resetTournamentAndBlinds">
                Reset timer &amp; blinds
              </button>
            </div>
          </section>

          <section v-if="showBlindEditor" class="card">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Blind schedule</p>
                <h2>Edit levels without leaving the clock</h2>
              </div>
              <button type="button" @click="addBlindLevel">Add level</button>
            </div>

            <div class="schedule-list">
              <div
                v-for="(level, index) in tournament.blindLevels"
                :key="index"
                class="schedule-row"
              >
                <span>Level {{ index + 1 }}</span>
                <label>
                  Small blind
                  <input
                    :value="level.smallBlind"
                    min="1"
                    type="number"
                    @input="
                      updateBlindLevel(
                        index,
                        'smallBlind',
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                  />
                </label>
                <label>
                  Big blind
                  <input
                    :value="level.bigBlind"
                    min="1"
                    type="number"
                    @input="
                      updateBlindLevel(
                        index,
                        'bigBlind',
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                  />
                </label>
                <label>
                  Minutes
                  <input
                    :value="level.durationMinutes"
                    min="1"
                    type="number"
                    @input="
                      updateBlindLevel(
                        index,
                        'durationMinutes',
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                  />
                </label>
                <button type="button" class="danger-button" @click="removeBlindLevel(index)">
                  Remove
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside class="card participants-card">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Live scoring</p>
              <h2>Players &amp; placings</h2>
            </div>
            <button type="button" @click="addParticipant">Add player</button>
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
            <div v-for="(row, index) in scoreRows" :key="index" class="score-row">
              <input v-model="row.name" aria-label="Participant name" placeholder="Name" />
              <input
                v-model.number="row.placement"
                aria-label="Placement"
                min="1"
                placeholder="1"
                type="number"
              />
              <input
                v-model.number="row.kills"
                aria-label="Kills"
                min="0"
                placeholder="0"
                type="number"
              />
              <label class="host-toggle-cell" aria-label="Hosted">
                <span>Host</span>
                <input v-model="row.hosted" type="checkbox" />
              </label>
              <strong class="score-total">{{ calculatePlayerScore(row) }}</strong>
              <button type="button" class="danger-button" @click="removeParticipant(index)">
                Remove
              </button>
            </div>
          </div>
          <p class="muted-copy participants-note">
            Live scoring stays local to this browser session. Season standings still use saved
            Season 20 results.
          </p>
          <strong class="live-points-total">{{ totalPrizePoints }} live-entry points</strong>
        </aside>
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
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
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
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
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
  position: relative;
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

.timer-panel:fullscreen {
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  padding: clamp(1.5rem, 5vw, 4rem);
  gap: 1rem;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.22), transparent 16rem),
    linear-gradient(135deg, rgba(13, 17, 25, 0.96), rgba(32, 16, 52, 0.98));
}

.timer-panel:fullscreen strong {
  font-size: clamp(6rem, 20vw, 12rem);
}

.timer-panel:fullscreen span {
  font-size: clamp(1.45rem, 4vw, 3rem);
}

.timer-panel:fullscreen .timer-fullscreen-button {
  top: 1.2rem;
  right: 1.2rem;
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

.timer-fullscreen-button {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  z-index: 1;
}

.compact-button {
  padding: 0.5rem 0.78rem;
  font-size: 0.86rem;
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
  gap: 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 1rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
}

.monthly-result-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
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

.live-workspace,
.two-column {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.85fr);
  gap: 1.5rem;
  align-items: start;
}

.live-main-column {
  display: grid;
  gap: 1rem;
}

.live-intro {
  margin-bottom: 0;
  font-size: 0.98rem;
}

.participants-card {
  position: sticky;
  top: 1rem;
}

.live-points-total {
  display: inline-flex;
  margin-top: 0.35rem;
  color: #ede9fe;
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

.score-header span:nth-child(4),
.score-header span:nth-child(5),
.host-toggle-cell,
.score-total {
  justify-self: center;
}

.host-toggle-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: #b8c0cc;
  font-size: 0.83rem;
}

.host-toggle-cell span {
  display: none;
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
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .timer-fullscreen-button {
    position: static;
    justify-self: end;
  }

  .live-workspace,
  .two-column,
  .schedule-row,
  .score-header,
  .score-row {
    grid-template-columns: 1fr;
  }

  .participants-card {
    position: static;
  }

  .score-header {
    display: none;
  }

  .score-header span:nth-child(4),
  .score-header span:nth-child(5),
  .host-toggle-cell,
  .score-total {
    justify-self: stretch;
  }

  .host-toggle-cell {
    justify-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.95rem;
    padding: 0.7rem 0.8rem;
    background: rgba(6, 8, 12, 0.72);
  }

  .host-toggle-cell span {
    display: inline;
  }
}
</style>
