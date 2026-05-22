export const DEFAULT_PARTICIPANTS = [
  'Byron',
  'Aleanna',
  'Scott',
  'James',
  'Ben',
  'Silvio',
  'Kevin',
  'Tama',
  'Lizzie',
] as const

export type ParticipantName = (typeof DEFAULT_PARTICIPANTS)[number]

export interface ScoreRow {
  name: string
  placement: number | null
  kills: number
  hosted: boolean
}

export interface BlindLevel {
  smallBlind: number
  bigBlind: number
  durationMinutes: number
}

export interface TournamentState {
  title: string
  levelIndex: number
  secondsRemaining: number
  isRunning: boolean
  blindLevels: BlindLevel[]
}

export interface SessionLikeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): unknown
  removeItem(key: string): unknown
}

export const SESSION_STORAGE_KEY = 'poker-app:tournament-mode'

export const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { smallBlind: 25, bigBlind: 50, durationMinutes: 20 },
  { smallBlind: 50, bigBlind: 100, durationMinutes: 20 },
  { smallBlind: 75, bigBlind: 150, durationMinutes: 20 },
  { smallBlind: 100, bigBlind: 200, durationMinutes: 20 },
  { smallBlind: 150, bigBlind: 300, durationMinutes: 15 },
  { smallBlind: 200, bigBlind: 400, durationMinutes: 15 },
  { smallBlind: 300, bigBlind: 600, durationMinutes: 15 },
  { smallBlind: 500, bigBlind: 1000, durationMinutes: 15 },
]

export const DEFAULT_TOURNAMENT_STATE: TournamentState = {
  title: 'Poker night tournament',
  levelIndex: 0,
  secondsRemaining: DEFAULT_BLIND_LEVELS[0]!.durationMinutes * 60,
  isRunning: false,
  blindLevels: DEFAULT_BLIND_LEVELS,
}

const placementPoints = (placement: number | null) => {
  if (!placement || placement < 1) return 0

  if (placement === 1) return 5
  if (placement === 2) return 4
  if (placement === 3) return 3
  if (placement === 4) return 2

  return 1
}

export const calculatePlayerScore = (row: ScoreRow) =>
  placementPoints(row.placement) + Math.max(0, row.kills) + (row.hosted ? 1 : 0)

export const createDefaultScoreRows = (): ScoreRow[] =>
  DEFAULT_PARTICIPANTS.map((name) => ({
    name,
    placement: null,
    kills: 0,
    hosted: false,
  }))

const sanitizeBlindLevel = (level: BlindLevel): BlindLevel => ({
  smallBlind: Math.max(1, Number(level.smallBlind) || 1),
  bigBlind: Math.max(1, Number(level.bigBlind) || 1),
  durationMinutes: Math.max(1, Number(level.durationMinutes) || 1),
})

export const normalizeTournamentState = (state: TournamentState): TournamentState => {
  const blindLevels = state.blindLevels.length
    ? state.blindLevels.map(sanitizeBlindLevel)
    : DEFAULT_BLIND_LEVELS
  const levelIndex = Math.min(Math.max(0, Number(state.levelIndex) || 0), blindLevels.length - 1)
  const fallbackSeconds = blindLevels[levelIndex]!.durationMinutes * 60

  return {
    title: state.title?.trim() || DEFAULT_TOURNAMENT_STATE.title,
    levelIndex,
    secondsRemaining: Math.max(0, Number(state.secondsRemaining) || fallbackSeconds),
    isRunning: Boolean(state.isRunning),
    blindLevels,
  }
}

export const loadTournamentState = (storage: SessionLikeStorage): TournamentState => {
  const raw = storage.getItem(SESSION_STORAGE_KEY)

  if (!raw) return structuredClone(DEFAULT_TOURNAMENT_STATE)

  try {
    return normalizeTournamentState(JSON.parse(raw) as TournamentState)
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY)
    return structuredClone(DEFAULT_TOURNAMENT_STATE)
  }
}

export const saveTournamentState = (storage: SessionLikeStorage, state: TournamentState) => {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizeTournamentState(state)))
}

export const clearTournamentState = (storage: SessionLikeStorage) => {
  storage.removeItem(SESSION_STORAGE_KEY)
}

export const formatTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
