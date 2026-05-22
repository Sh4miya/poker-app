import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PARTICIPANTS,
  DEFAULT_TOURNAMENT_STATE,
  SEASON_NUMBER,
  SEASON_RANGE,
  SEASON_SCHEDULE,
  calculatePlayerScore,
  createDefaultScoreRows,
  createDefaultTournamentState,
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
      'Kevin',
      'Tama',
      'Lizzie',
      'Greg',
    ])
  })

  it('tracks season 20 schedule with Silvio as the next host', () => {
    expect(SEASON_NUMBER).toBe(20)
    expect(SEASON_RANGE).toBe('March to August')
    expect(SEASON_SCHEDULE).toEqual([
      { dateLabel: 'Friday 13 March', host: 'Aleanna', isNext: false },
      { dateLabel: 'Friday 10 April', host: 'Scott', isNext: false },
      { dateLabel: 'Friday 8 May', host: 'Kevin', isNext: false },
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

  it('creates editable score rows for every participant', () => {
    expect(createDefaultScoreRows()).toEqual(
      DEFAULT_PARTICIPANTS.map((name) => ({ name, placement: null, kills: 0, hosted: false })),
    )
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
})
