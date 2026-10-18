import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const LOCALE_KEY = 'sub2api_locale'
const english = { dashboard: { title: 'Dashboard' }, fallbackOnly: 'English fallback' }
const chinese = { dashboard: { title: '仪表盘' } }
const vietnamese = { dashboard: { title: 'Bảng điều khiển' } }
const expectedLocales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
]

// Support both the shared Map-backed storage and jsdom's native Storage proxy.
const spyOnPersistence = () => vi.spyOn(
  Object.prototype.hasOwnProperty.call(localStorage, 'setItem')
    ? localStorage
    : Object.getPrototypeOf(localStorage) as Storage,
  'setItem'
)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

let catalogs: string[]
let dependencies: string[]
let originalLang: string | null
let originalTitle: string
let pendingCleanup: Array<() => Promise<unknown>>

beforeEach(() => {
  vi.resetModules()
  // Vitest's runtime-only alias cannot compile these tiny string fixtures.
  // Use the real compiler-enabled library here, without replacing createI18n or t.
  vi.doMock('vue-i18n', () => vi.importActual<typeof import('vue-i18n')>(new URL('../../../node_modules/vue-i18n/dist/vue-i18n.esm-bundler.js', import.meta.url).pathname))
  localStorage.clear()
  originalLang = document.documentElement.getAttribute('lang')
  originalTitle = document.title
  document.documentElement.setAttribute('lang', 'before-init')
  document.title = 'Previous title'
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  catalogs = []
  dependencies = []
  pendingCleanup = []

  vi.doMock('../locales/en', () => {
    catalogs.push('en')
    return { default: english }
  })
  vi.doMock('../locales/zh', () => {
    catalogs.push('zh')
    return { default: chinese }
  })
  vi.doMock('../locales/vi', () => {
    catalogs.push('vi')
    return { default: vietnamese }
  })
  vi.doMock('@/router', () => {
    dependencies.push('router')
    return { default: { currentRoute: { value: {
      name: 'Dashboard', params: {}, meta: { titleKey: 'dashboard.title', title: 'Dashboard' }
    } } } }
  })
  vi.doMock('@/stores/app', () => {
    dependencies.push('app')
    return { useAppStore: () => ({
      siteName: 'Sub2API', cachedPublicSettings: { custom_menu_items: [] }
    }) }
  })
  vi.doMock('@/stores/auth', () => {
    dependencies.push('auth')
    return { useAuthStore: () => ({ isAdmin: false }) }
  })
  vi.doMock('@/stores/adminSettings', () => {
    dependencies.push('adminSettings')
    return { useAdminSettingsStore: () => ({ customMenuItems: [] }) }
  })
})

afterEach(async () => {
  await Promise.all(pendingCleanup.map((cleanup) => cleanup()))
  localStorage.clear()
  if (originalLang === null) {
    document.documentElement.removeAttribute('lang')
  } else {
    document.documentElement.setAttribute('lang', originalLang)
  }
  document.title = originalTitle
  vi.restoreAllMocks()
  vi.doUnmock('vue-i18n')
  vi.doUnmock('../locales/en')
  vi.doUnmock('../locales/zh')
  vi.doUnmock('../locales/vi')
  vi.doUnmock('@/router')
  vi.doUnmock('@/stores/app')
  vi.doUnmock('@/stores/auth')
  vi.doUnmock('@/stores/adminSettings')
  vi.resetModules()
})

describe('locale runtime', () => {
  it('registers exactly English, Chinese and Vietnamese without eagerly loading catalogs', async () => {
    const runtime = await import('../index')

    expect(runtime.availableLocales).toEqual(expectedLocales)
    expect(catalogs).toEqual([])
    expect(dependencies).toEqual([])
  })

  it.each([
    { saved: 'vi', browser: 'en-US', expected: 'vi' },
    { saved: 'vi', browser: 'zh-CN', expected: 'vi' },
    { saved: 'en', browser: 'zh-CN', expected: 'en' },
    { saved: 'zh', browser: 'en-US', expected: 'zh' },
    { saved: 'fr', browser: 'zh-CN', expected: 'zh' },
    { saved: 'fr', browser: 'en-US', expected: 'en' },
    { saved: 'VI', browser: 'en-US', expected: 'en' },
    { saved: null, browser: 'vi-VN', expected: 'en' },
    { saved: null, browser: 'ZH-tw', expected: 'zh' }
  ])('keeps preference/default policy for $saved / $browser', async ({ saved, browser, expected }) => {
    if (saved !== null) localStorage.setItem(LOCALE_KEY, saved)
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browser)
    const persist = spyOnPersistence()
    const runtime = await import('../index')

    expect(runtime.getLocale()).toBe(expected)
    expect(runtime.i18n.global.locale.value).toBe(expected)
    expect(localStorage.getItem(LOCALE_KEY)).toBe(saved)
    expect(persist).not.toHaveBeenCalled()
    expect(catalogs).toEqual([])
  })

  it.each([
    { saved: null, expected: 'en', loaded: ['en'] },
    { saved: 'zh', expected: 'zh', loaded: ['en', 'zh'] },
    { saved: 'vi', expected: 'vi', loaded: ['en', 'vi'] }
  ])('initializes $expected with loaded English fallback and no preference write', async ({ saved, expected, loaded }) => {
    if (saved !== null) localStorage.setItem(LOCALE_KEY, saved)
    const persist = spyOnPersistence()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = await import('../index')

    await runtime.initI18n()

    expect(catalogs).toEqual(loaded)
    expect(runtime.getLocale()).toBe(expected)
    expect(document.documentElement.lang).toBe(expected)
    expect(runtime.i18n.global.t('fallbackOnly')).toBe('English fallback')
    expect(localStorage.getItem(LOCALE_KEY)).toBe(saved)
    expect(persist).not.toHaveBeenCalled()
    expect(document.title).toBe('Previous title')
    expect(dependencies).toEqual([])
    if (expected !== 'en') {
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Fall back to translate 'fallbackOnly' key with 'en' locale."))
    }
  })

  it('installs each successful catalog only once across repeated init and direct loads', async () => {
    localStorage.setItem(LOCALE_KEY, 'zh')
    const runtime = await import('../index')
    expect(runtime.availableLocales).toEqual(expectedLocales)
    const install = vi.spyOn(runtime.i18n.global, 'setLocaleMessage')

    await runtime.initI18n()
    await runtime.initI18n()
    for (const locale of ['en', 'zh', 'vi'] as const) {
      await runtime.loadLocaleMessages(locale)
      await runtime.loadLocaleMessages(locale)
    }

    expect(catalogs).toEqual(['en', 'zh', 'vi'])
    expect(install.mock.calls.map(([locale]) => locale)).toEqual(['en', 'zh', 'vi'])
  })

  it('switches en → vi → zh → en with effective state, cached bundles and real translated titles', async () => {
    const runtime = await import('../index')
    expect(runtime.availableLocales).toEqual(expectedLocales)
    const install = vi.spyOn(runtime.i18n.global, 'setLocaleMessage')
    await runtime.initI18n()

    for (const [locale, title] of [
      ['vi', 'Bảng điều khiển - Sub2API'],
      ['zh', '仪表盘 - Sub2API'],
      ['en', 'Dashboard - Sub2API']
    ]) {
      await runtime.setLocale(locale!)
      expect(runtime.getLocale()).toBe(locale)
      expect(runtime.i18n.global.locale.value).toBe(locale)
      expect(localStorage.getItem(LOCALE_KEY)).toBe(locale)
      expect(document.documentElement.lang).toBe(locale)
      expect(document.title).toBe(title)
    }
    expect(catalogs).toEqual(['en', 'vi', 'zh'])
    expect(install.mock.calls.map(([locale]) => locale)).toEqual(['en', 'vi', 'zh'])

    localStorage.setItem(LOCALE_KEY, 'vi')
    expect(runtime.getLocale()).toBe('en')
    expect(runtime.i18n.global.locale.value).toBe('en')
  })

  it('treats an invalid switch as a complete no-op without loading catalogs or dependencies', async () => {
    localStorage.setItem(LOCALE_KEY, 'en')
    const runtime = await import('../index')
    const persist = spyOnPersistence()

    await expect(runtime.setLocale('fr')).resolves.toBeUndefined()

    expect(runtime.getLocale()).toBe('en')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('before-init')
    expect(document.title).toBe('Previous title')
    expect(persist).not.toHaveBeenCalled()
    expect(catalogs).toEqual([])
    expect(dependencies).toEqual([])
  })

  it('loads English before committing a switch even without prior initialization', async () => {
    const runtime = await import('../index')
    expect(runtime.availableLocales).toEqual(expectedLocales)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await runtime.setLocale('vi')

    expect(catalogs).toEqual(['en', 'vi'])
    expect(runtime.i18n.global.t('fallbackOnly')).toBe('English fallback')
    expect(runtime.getLocale()).toBe('vi')
    expect(document.title).toBe('Bảng điều khiển - Sub2API')
    expect(warn).toHaveBeenCalled()
  })

  it('does not commit a deferred selected catalog until loading completes', async () => {
    const entered = deferred<void>()
    const catalog = deferred<{ default: typeof vietnamese }>()
    vi.doMock('../locales/vi', () => {
      catalogs.push('vi')
      entered.resolve()
      return catalog.promise
    })
    const runtime = await import('../index')
    expect(runtime.availableLocales).toEqual(expectedLocales)
    await runtime.initI18n()
    await runtime.setLocale('en')
    const persist = spyOnPersistence()
    const switching = runtime.setLocale('vi')
    const settled = switching.then(() => undefined, (error: unknown) => error)
    pendingCleanup.push(async () => {
      catalog.resolve({ default: vietnamese })
      await settled
    })
    await entered.promise

    expect(runtime.getLocale()).toBe('en')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Dashboard - Sub2API')
    expect(persist).not.toHaveBeenCalled()

    catalog.resolve({ default: vietnamese })
    await switching

    expect(runtime.getLocale()).toBe('vi')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('vi')
    expect(document.documentElement.lang).toBe('vi')
    expect(document.title).toBe('Bảng điều khiển - Sub2API')
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith(LOCALE_KEY, 'vi')
  })

  it('preserves the previous state and rejects a failed runtime catalog load', async () => {
    const entered = deferred<void>()
    const catalog = deferred<{ default: typeof vietnamese }>()
    vi.doMock('../locales/vi', () => {
      catalogs.push('vi')
      entered.resolve()
      return catalog.promise
    })
    const runtime = await import('../index')
    expect(runtime.availableLocales).toEqual(expectedLocales)
    await runtime.initI18n()
    await runtime.setLocale('en')
    const persist = spyOnPersistence()
    const failure = new Error('Vietnamese catalog unavailable')
    const switching = runtime.setLocale('vi')
    const rejected = switching.then(() => undefined, (error: unknown) => error)
    pendingCleanup.push(async () => {
      catalog.resolve({ default: vietnamese })
      await rejected
    })
    await entered.promise
    catalog.reject(failure)
    // Vitest wraps rejected mock factories; the loader rejection retains its cause.
    expect(await rejected).toMatchObject({ cause: failure })

    expect(runtime.getLocale()).toBe('en')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Dashboard - Sub2API')
    expect(persist).not.toHaveBeenCalled()
    expect(catalogs).toEqual(['en', 'vi'])
  })

  it('falls back to English on startup selected-catalog failure without discarding saved Vietnamese', async () => {
    localStorage.setItem(LOCALE_KEY, 'vi')
    const failure = new Error('Vietnamese catalog unavailable')
    vi.doMock('../locales/vi', () => {
      catalogs.push('vi')
      throw failure
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const persist = spyOnPersistence()
    const runtime = await import('../index')

    await expect(runtime.initI18n()).resolves.toBeUndefined()

    expect(catalogs).toEqual(['en', 'vi'])
    expect(runtime.getLocale()).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(runtime.i18n.global.t('dashboard.title')).toBe('Dashboard')
    expect(runtime.i18n.global.t('fallbackOnly')).toBe('English fallback')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('vi')
    expect(persist).not.toHaveBeenCalled()
    expect(document.title).toBe('Previous title')
    expect(dependencies).toEqual([])
    expect(warn).toHaveBeenCalledWith('[i18n] Failed to load locale "vi"; using English.', expect.anything())
  })

  it('propagates English startup failure without loading a substitute or mutating browser state', async () => {
    localStorage.setItem(LOCALE_KEY, 'zh')
    vi.doMock('../locales/en', () => {
      catalogs.push('en')
      throw new Error('English catalog unavailable')
    })
    const persist = spyOnPersistence()
    const runtime = await import('../index')

    await expect(runtime.initI18n()).rejects.toThrow()

    expect(catalogs).toEqual(['en'])
    expect(runtime.getLocale()).toBe('zh')
    expect(document.documentElement.lang).toBe('before-init')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('zh')
    expect(document.title).toBe('Previous title')
    expect(persist).not.toHaveBeenCalled()
    expect(dependencies).toEqual([])
  })
})
