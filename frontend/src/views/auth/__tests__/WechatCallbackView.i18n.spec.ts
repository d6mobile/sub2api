import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveWeChatOAuthStartStrict } from '@/api/auth'
import en from '@/i18n/locales/en/common'
import zh from '@/i18n/locales/zh/common'
import vietnamese from '@/i18n/locales/vi/common'
import WechatCallbackView from '@/views/auth/WechatCallbackView.vue'

const { createI18n } = await vi.importActual<typeof import('vue-i18n')>(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../node_modules/vue-i18n/dist/vue-i18n.esm-bundler.js')
)

const originalEnglishMessage = 'This WeChat sign-in flow is only available from the native mobile app.'

const { routeState, replaceMock, appStoreState } = vi.hoisted(() => ({
  routeState: {
    query: { wechat_bind_existing: '1' },
  },
  replaceMock: vi.fn(),
  appStoreState: {
    cachedPublicSettings: {
      wechat_oauth_enabled: true,
      wechat_oauth_open_enabled: false,
      wechat_oauth_mp_enabled: false,
      wechat_oauth_mobile_enabled: true,
    },
    publicSettingsLoaded: true,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    fetchPublicSettings: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('@/stores', () => ({
  useAppStore: () => appStoreState,
  useAuthStore: () => ({
    setToken: vi.fn(),
    setPendingAuthSession: vi.fn(),
    clearPendingAuthSession: vi.fn(),
  }),
}))

// This unavailable reason is not emitted by the real resolver yet. Keep every
// other auth export real and exercise the mounted view's message helper.
vi.mock('@/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/auth')>()),
  resolveWeChatOAuthStartStrict: vi.fn(() => ({
    mode: null,
    openEnabled: false,
    mpEnabled: false,
    mobileEnabled: true,
    isWeChatBrowser: false,
    unavailableReason: 'native_app_required',
  })),
}))

describe('WechatCallbackView native app message i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    replaceMock.mockResolvedValue(undefined)
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0')
  })

  it.each([
    ['en', originalEnglishMessage],
    ['zh', zh.auth.oauthFlow.wechatNativeAppOnly],
    ['vi', vietnamese.auth.oauthFlow.wechatNativeAppOnly],
  ] as const)('resolves the native-app-only message in %s', async (locale, expectedMessage) => {
    const i18n = createI18n({
      legacy: false,
      locale,
      fallbackLocale: 'en',
      messages: { en, zh, vi: vietnamese },
    })
    const wrapper = mount(WechatCallbackView, {
      global: {
        plugins: [i18n],
        stubs: {
          AuthLayout: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    try {
      await flushPromises()
      // Runtime mode fallback currently prevents the unavailable message from
      // reaching errorMessage/showError. Assert the real message helper rather
      // than claiming to cover a user-visible error path that cannot run yet.
      const view = wrapper.vm as unknown as {
        resolveWeChatOAuthUnavailableMessage: () => string
      }
      const message = view.resolveWeChatOAuthUnavailableMessage()
      expect(typeof expectedMessage).toBe('string')
      expect(message).toBe(expectedMessage)
      expect(resolveWeChatOAuthStartStrict).toHaveBeenCalledWith(appStoreState.cachedPublicSettings)
      expect(appStoreState.showError).not.toHaveBeenCalled()
      if (locale === 'vi') {
        expect(message).not.toMatch(/\p{Script=Han}/u)
        expect(message).not.toBe(originalEnglishMessage)
      }
    } finally {
      wrapper.unmount()
    }
  })
})
