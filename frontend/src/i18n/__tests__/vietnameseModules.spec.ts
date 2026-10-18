import { describe, expect, it } from 'vitest'

import { validateLocaleContract } from './helpers/localeContract'

const modules = import.meta.glob('../locales/{en,vi}/**/*.ts', { eager: true, import: 'default' })
const vietnamesePayloads = Object.keys(modules)
  .filter(path => path.startsWith('../locales/vi/') && !path.endsWith('/index.ts'))
  .sort()

describe('incremental Vietnamese module contracts (not complete locale coverage)', () => {
  if (vietnamesePayloads.length === 0) {
    it.skip('checks discovered Vietnamese payloads against English peers (no Vietnamese payloads yet)', () => {})
    return
  }

  it.each(vietnamesePayloads)('%s matches its English peer', path => {
    const englishPath = path.replace('../locales/vi/', '../locales/en/')
    expect(
      Object.prototype.hasOwnProperty.call(modules, englishPath),
      `${path}: missing English peer ${englishPath}`
    ).toBe(true)
    expect(validateLocaleContract(modules[englishPath], modules[path]), path).toEqual([])
  })
})
