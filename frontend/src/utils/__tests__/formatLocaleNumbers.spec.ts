import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatNumberLocaleString } from '../format'
import { formatCacheTokens } from '../formatters'

const mockLocale = vi.hoisted(() => ({ value: 'en' }))

vi.mock('@/i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
  getLocale: () => mockLocale.value
}))

afterEach(() => {
  mockLocale.value = 'en'
  vi.restoreAllMocks()
})

describe.each(['vi', 'zh', 'en'])('number formatting in %s', (locale) => {
  it('passes the current locale to formatNumberLocaleString', () => {
    mockLocale.value = locale
    const toLocaleString = vi.spyOn(Number.prototype, 'toLocaleString').mockReturnValue('localized number')

    expect(formatNumberLocaleString(12345)).toBe('localized number')
    expect(toLocaleString).toHaveBeenCalledTimes(1)
    expect(toLocaleString).toHaveBeenCalledWith(locale)
  })

  it('passes the current locale to formatCacheTokens below 1000', () => {
    mockLocale.value = locale
    const toLocaleString = vi.spyOn(Number.prototype, 'toLocaleString').mockReturnValue('localized tokens')

    expect(formatCacheTokens(999)).toBe('localized tokens')
    expect(toLocaleString).toHaveBeenCalledTimes(1)
    expect(toLocaleString).toHaveBeenCalledWith(locale)
  })

  it('preserves the K and M token abbreviations', () => {
    mockLocale.value = locale
    const toLocaleString = vi.spyOn(Number.prototype, 'toLocaleString')

    expect(formatCacheTokens(1500)).toBe('1.5K')
    expect(formatCacheTokens(2300000)).toBe('2.3M')
    expect(toLocaleString).not.toHaveBeenCalled()
  })
})
