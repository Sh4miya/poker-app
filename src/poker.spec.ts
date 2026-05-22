import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PARTICIPANTS,
  DEFAULT_TOURNAMENT_STATE,
  calculatePlayerScore,
  createDefaultScoreRows,
  loadTournamentState,
  saveTournamentState,
  type ScoreRow,
  type TournamentState,
} from './poker'

const memoryStorage = () => {
  const data = new Map<string, string>()

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  }
}

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

  it('persists tournament mode to session storage only', () => {
    const storage = memoryStorage()
    const state: TournamentState = {
      ...DEFAULT_TOURNAMENT_STATE,
      title: 'Friday night poker',
      blindLevels: [{ smallBlind: 50, bigBlind: 100, durationMinutes: 15 }],
    }

    saveTournamentState(storage, state)

    expect(loadTournamentState(storage)).toEqual(state)
  })
})
