export const DEFAULT_PARTICIPANTS = [
  'Byron',
  'Aleanna',
  'Scott',
  'James',
  'Ben',
  'Silvio',
  'Kev',
  'Tama',
  'Lizzie',
  'Greg',
  'Cookie',
] as const

export type ParticipantName = (typeof DEFAULT_PARTICIPANTS)[number]

export const SEASON_NUMBER = 20
export const SEASON_RANGE = 'March to August'

export interface PokerNight {
  dateLabel: string
  host: ParticipantName
  isNext: boolean
}

export const SEASON_SCHEDULE: PokerNight[] = [
  { dateLabel: 'Friday 13 March', host: 'Aleanna', isNext: false },
  { dateLabel: 'Friday 10 April', host: 'Scott', isNext: false },
  { dateLabel: 'Friday 8 May', host: 'Kev', isNext: false },
  { dateLabel: 'Friday 12 June', host: 'Silvio', isNext: true },
  { dateLabel: 'Thursday 9 July', host: 'Byron', isNext: false },
  { dateLabel: 'Friday 14 August', host: 'Greg', isNext: false },
]

export interface ScoreRow {
  name: string
  placement: number | null
  kills: number
  hosted: boolean
}

export interface StandingRow {
  name: string
  points: number
}

export interface SeasonResultEntry {
  name: ParticipantName
  placementLabel: string
  points: number
}

export interface SeasonResultMonth {
  month: string
  entries: SeasonResultEntry[]
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

const createSeasonEntries = (
  results: readonly [ParticipantName, number][],
): SeasonResultEntry[] =>
  results.map(([name, placement]) => ({
    name,
    placementLabel: placement >= 5 ? '5th+' : `${placement}${ordinalSuffix(placement)}`,
    points: placementPoints(placement),
  }))

const ordinalSuffix = (placement: number) => {
  if (placement === 1) return 'st'
  if (placement === 2) return 'nd'
  if (placement === 3) return 'rd'

  return 'th'
}

export const SEASON_RESULTS: SeasonResultMonth[] = [
  {
    month: 'May',
    entries: createSeasonEntries([
      ['Ben', 1],
      ['Scott', 2],
      ['Greg', 3],
      ['Aleanna', 4],
      ['Byron', 5],
      ['James', 5],
      ['Kev', 5],
      ['Lizzie', 5],
      ['Silvio', 5],
    ]),
  },
  {
    month: 'April',
    entries: createSeasonEntries([
      ['James', 1],
      ['Aleanna', 2],
      ['Lizzie', 3],
      ['Scott', 4],
      ['Ben', 5],
      ['Silvio', 5],
      ['Greg', 5],
      ['Tama', 5],
      ['Byron', 5],
    ]),
  },
  {
    month: 'March',
    entries: createSeasonEntries([
      ['Silvio', 1],
      ['Aleanna', 2],
      ['James', 3],
      ['Lizzie', 4],
      ['Ben', 5],
      ['Greg', 5],
      ['Cookie', 5],
    ]),
  },
]

export const calculatePlayerScore = (row: ScoreRow) =>
  placementPoints(row.placement) + Math.max(0, row.kills) + (row.hosted ? 1 : 0)

export const createSeasonStandings = (results: readonly SeasonResultMonth[] = SEASON_RESULTS): StandingRow[] => {
  const totals = new Map<string, number>(DEFAULT_PARTICIPANTS.map((name) => [name, 0]))

  results.forEach((month) => {
    month.entries.forEach((entry) => {
      totals.set(entry.name, (totals.get(entry.name) ?? 0) + entry.points)
    })
  })

  return Array.from(totals, ([name, points]) => ({ name, points })).sort(
    (left, right) => right.points - left.points || left.name.localeCompare(right.name),
  )
}

export const SEASON_STANDINGS = createSeasonStandings()

export const createDefaultScoreRows = (): ScoreRow[] =>
  DEFAULT_PARTICIPANTS.map((name) => ({
    name,
    placement: null,
    kills: 0,
    hosted: false,
  }))

export const createLocalScoreRows = (): ScoreRow[] => [
  { name: '', placement: null, kills: 0, hosted: false },
]

export const createZeroPointStandings = (names: readonly string[] = DEFAULT_PARTICIPANTS): StandingRow[] =>
  names.map((name) => ({
    name,
    points: 0,
  }))

export const createDefaultTournamentState = (): TournamentState =>
  structuredClone(DEFAULT_TOURNAMENT_STATE)

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

export const formatTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
