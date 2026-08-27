import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatLocalDate,
  isLocalDate,
  isWithinServerAcceptanceWindow,
  monthOf,
} from './localDate'

describe('isLocalDate', () => {
  it('accepts valid dates', () => {
    expect(isLocalDate('2026-08-27')).toBe(true)
    expect(isLocalDate('2026-02-29')).toBe(false) // 2026 is not a leap year
    expect(isLocalDate('2024-02-29')).toBe(true)
  })
  it('rejects malformed strings', () => {
    expect(isLocalDate('2026-8-27')).toBe(false)
    expect(isLocalDate('2026-13-01')).toBe(false)
    expect(isLocalDate('not-a-date')).toBe(false)
  })
})

describe('formatLocalDate', () => {
  // vitest.config.ts で TZ=Asia/Tokyo に固定している
  it('returns the device-local date, not the UTC date', () => {
    // UTC 2026-08-26 23:30 = JST 2026-08-27 08:30
    expect(formatLocalDate(new Date('2026-08-26T23:30:00Z'))).toBe('2026-08-27')
  })
  it('handles the local midnight boundary (23:59 -> 0:00)', () => {
    expect(formatLocalDate(new Date('2026-08-27T14:59:59Z'))).toBe('2026-08-27') // JST 23:59
    expect(formatLocalDate(new Date('2026-08-27T15:00:00Z'))).toBe('2026-08-28') // JST 0:00
  })
})

describe('addDays / monthOf', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('monthOf extracts the ranking/calendar aggregation key', () => {
    expect(monthOf('2026-08-27')).toBe('2026-08')
  })
})

describe('isWithinServerAcceptanceWindow', () => {
  const serverNow = new Date('2026-08-27T12:00:00Z')

  it('accepts today and adjacent dates that exist somewhere on Earth', () => {
    expect(isWithinServerAcceptanceWindow('2026-08-27', serverNow)).toBe(true)
    expect(isWithinServerAcceptanceWindow('2026-08-26', serverNow)).toBe(true) // UTC-12圏の「今日」
    expect(isWithinServerAcceptanceWindow('2026-08-28', serverNow)).toBe(true) // UTC+14圏の「今日」
  })
  it('rejects fabricated past/future dates', () => {
    expect(isWithinServerAcceptanceWindow('2026-08-24', serverNow)).toBe(false)
    expect(isWithinServerAcceptanceWindow('2026-08-30', serverNow)).toBe(false)
    expect(isWithinServerAcceptanceWindow('2025-08-27', serverNow)).toBe(false)
  })
  it('rejects malformed input', () => {
    expect(isWithinServerAcceptanceWindow('27-08-2026', serverNow)).toBe(false)
  })
  it('window boundary: exactly at the edge is accepted', () => {
    // serverNow - 26h = 2026-08-26T10:00Z → earliest date '2026-08-26'
    expect(isWithinServerAcceptanceWindow('2026-08-26', serverNow, 26)).toBe(true)
    // serverNow - 26h だと 08-25 には届かない
    expect(isWithinServerAcceptanceWindow('2026-08-25', serverNow, 26)).toBe(false)
  })
})
