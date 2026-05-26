import appSource from './App.vue?raw'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PARTICIPANTS,
  DEFAULT_TOURNAMENT_STATE,
  SEASON_NUMBER,
  SEASON_RANGE,
  SEASON_RESULTS,
  SEASON_SCHEDULE,
  SEASON_STANDINGS,
  calculatePlayerScore,
  createDefaultScoreRows,
  createDefaultTournamentState,
  createLocalScoreRows,
  createSeasonStandings,
  createZeroPointStandings,
  type ScoreRow,
} from './poker'

describe('poker scoring and tournament defaults', () => {
  it('includes the requested participants in order', () => {
    expect(DEFAULT_PARTICIPANTS).toEqual([
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
    ])
  })

  it('tracks season 20 schedule with Silvio as the next host', () => {
    expect(SEASON_NUMBER).toBe(20)
    expect(SEASON_RANGE).toBe('March to August')
    expect(SEASON_SCHEDULE).toEqual([
      { dateLabel: 'Friday 13 March', host: 'Aleanna', isNext: false },
      { dateLabel: 'Friday 10 April', host: 'Scott', isNext: false },
      { dateLabel: 'Friday 8 May', host: 'Kev', isNext: false },
      { dateLabel: 'Friday 12 June', host: 'Silvio', isNext: true },
      { dateLabel: 'Thursday 9 July', host: 'Byron', isNext: false },
      { dateLabel: 'Friday 14 August', host: 'Greg', isNext: false },
    ])
  })

  it('calculates placement, host, and kill points', () => {
    const row: ScoreRow = {
      name: 'Byron',
      placement: 2,
      kills: 3,
      hosted: true,
    }

    expect(calculatePlayerScore(row)).toBe(8)
  })

  it('awards one point for fifth place onwards', () => {
    expect(calculatePlayerScore({ name: 'Lizzie', placement: 9, kills: 0, hosted: false })).toBe(1)
  })

  it('stores March, April, and May Season 20 result entries', () => {
    expect(SEASON_RESULTS.map((month) => month.month)).toEqual(['May', 'April', 'March'])
    expect(
      SEASON_RESULTS[0]!.entries.map((entry) => `${entry.placementLabel} ${entry.name}`),
    ).toEqual([
      '1st Ben',
      '2nd Scott',
      '3rd Greg',
      '4th Aleanna',
      '5th+ Byron',
      '5th+ James',
      '5th+ Kev',
      '5th+ Lizzie',
      '5th+ Silvio',
    ])
    expect(
      SEASON_RESULTS[1]!.entries.map((entry) => `${entry.placementLabel} ${entry.name}`),
    ).toEqual([
      '1st James',
      '2nd Aleanna',
      '3rd Lizzie',
      '4th Scott',
      '5th+ Ben',
      '5th+ Silvio',
      '5th+ Greg',
      '5th+ Tama',
      '5th+ Byron',
    ])
    expect(
      SEASON_RESULTS[2]!.entries.map((entry) => `${entry.placementLabel} ${entry.name}`),
    ).toEqual([
      '1st Silvio',
      '2nd Aleanna',
      '3rd James',
      '4th Lizzie',
      '5th+ Ben',
      '5th+ Greg',
      '5th+ Cookie',
    ])
  })

  it('calculates Season 20 standings from the entered monthly results', () => {
    expect(createSeasonStandings()).toEqual([
      { name: 'Aleanna', points: 11 },
      { name: 'James', points: 9 },
      { name: 'Ben', points: 7 },
      { name: 'Scott', points: 7 },
      { name: 'Silvio', points: 7 },
      { name: 'Lizzie', points: 6 },
      { name: 'Greg', points: 5 },
      { name: 'Byron', points: 2 },
      { name: 'Kev', points: 2 },
      { name: 'Cookie', points: 1 },
      { name: 'Tama', points: 1 },
    ])
    expect(SEASON_STANDINGS).toEqual(createSeasonStandings())
  })

  it('creates editable score rows for every participant', () => {
    expect(createDefaultScoreRows()).toEqual(
      DEFAULT_PARTICIPANTS.map((name) => ({ name, placement: null, kills: 0, hosted: false })),
    )
  })

  it('starts local mode with one empty editable participant row', () => {
    expect(createLocalScoreRows()).toEqual([{ name: '', placement: null, kills: 0, hosted: false }])
  })

  it('starts rankings and standings with every participant on zero points', () => {
    expect(createZeroPointStandings()).toEqual(
      DEFAULT_PARTICIPANTS.map((name) => ({ name, points: 0 })),
    )
  })

  it('creates a fresh tournament state without session storage', () => {
    const state = createDefaultTournamentState()

    state.title = 'Friday night poker'
    state.blindLevels[0]!.smallBlind = 999

    expect(createDefaultTournamentState()).toEqual(DEFAULT_TOURNAMENT_STATE)
  })

  it('keeps the points rules section at the bottom of rankings', () => {
    const app = appSource
    const rankingsStart = app.indexOf('<div class="card standings-card">')
    const rankingsEnd = app.indexOf('</div>\n      </section>', rankingsStart)
    const pointsRules = app.indexOf('<div class="standings-points-rules">', rankingsStart)

    expect(rankingsStart).toBeGreaterThan(-1)
    expect(rankingsEnd).toBeGreaterThan(rankingsStart)
    expect(pointsRules).toBeGreaterThan(rankingsStart)
    expect(pointsRules).toBeLessThan(rankingsEnd)
  })

  it('shows a rankings and standings navigation button away from the home page', () => {
    const app = appSource

    expect(app).toContain('<RouterLink v-if="!isHomePage" class="nav-button ghost-button" to="/">')
    expect(app).toContain('Rankings &amp; Standings')
  })

  it('keeps monthly result placings hidden behind per-month buttons', () => {
    const app = appSource

    expect(app).toContain('const visibleResultMonths = ref<Set<string>>(new Set())')
    expect(app).toContain("'Show placings'")
    expect(app).toContain('v-if="visibleResultMonths.has(month.month)"')
  })

  it('keeps editable participant rows stable and labelled for mobile typing', () => {
    const app = appSource

    expect(app).toContain(':key="index" class="score-row"')
    expect(app).toContain('placeholder="Player name"')
    expect(app).toContain('placeholder="Place"')
    expect(app).toContain('placeholder="Kills"')
  })

  it('keeps participant editing inside local browser session mode', () => {
    const app = appSource

    expect(app).toContain("const isLocalPage = computed(() => route.path === '/local')")
    expect(app).toContain('<RouterLink class="nav-button" to="/local">Local mode</RouterLink>')
    expect(app).not.toContain('to="/participants"')
    expect(app).toContain('<template v-else-if="isLocalPage">')
    expect(app).toContain('Editable participants')
  })

  it('hides the editable blind schedule until edit blinds is selected', () => {
    const app = appSource

    expect(app).toContain('const showBlindEditor = ref(false)')
    expect(app).toContain('@click="showBlindEditor = !showBlindEditor"')
    expect(app).toContain("{{ showBlindEditor ? 'Hide blinds' : 'Edit blinds' }}")
    expect(app).toContain('<section v-if="showBlindEditor" class="card">')
  })
})
