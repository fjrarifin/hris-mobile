import { describe, expect, test } from 'vitest'
import { requestDate } from '@/utils/requestFormatters'

describe('requestDate', () => {
  test('formats Laravel date casts in Jakarta calendar date', () => {
    expect(requestDate('2026-05-31T17:00:00.000000Z')).toBe('01 Jun 2026')
  })

  test('formats date-only values without timezone shifting', () => {
    expect(requestDate('2026-06-01')).toBe('01 Jun 2026')
  })
})
