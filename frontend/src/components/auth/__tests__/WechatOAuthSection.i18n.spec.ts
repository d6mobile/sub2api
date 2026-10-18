import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveWeChatOAuthStart } from '@/api/auth'
import WechatOAuthSection from '@/components/auth/WechatOAuthSection.vue'
import en from '@/i18n/locales/en/common'
import zh from '@/i18n/locales/zh/common'
import vietnamese from '@/i18n/locales/vi/common'
import { useAppStore } from '@/stores'
import type { PublicSettings } from '@/types'

const { createI18n } = await vi.importActual<typeof import('vue-i18n')>(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../node_modules/vue-i18n/dist/vue-i18n.esm-bundler.js')
)

const originalEnglishHint = 'This site only has WeChat mobile app login configured. Continue from the native app through the WeChat SDK.'
const originalChineseHint = '当前仅配置微信移动应用登录，需要在原生 App 中通过微信 SDK 发起授权。'

const routeState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
}))

// The real resolver does not yet return native_app_required. Only replace that
// boundary so the existing component branch is covered with real translations.
vi.mock('@/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/auth')>()),
  resolveWeChatOAuthStart: vi.fn(() => ({
    mode: null,
    openEnabled: false,
    mpEnabled: false,
    mobileEnabled: true,
    isWeChatBrowser: false,
    unavailableReason: 'native_app_required',
  })),
}))

type WeChatPublicSettings = PublicSettings & {
  wechat_oauth_open_enabled?: boolean
  wechat_oauth_mp_enabled?: boolean
  wechat_oauth_mobile_enabled?: boolean
}

function buildPublicSettings(overrides: Partial<WeChatPublicSettings> = {}): WeChatPublicSettings {
  return {
    registration_enabled: true,
    email_verify_enabled: false,
    force_email_on_third_party_signup: false,
    registration_email_suffix_whitelist: [],
    promo_code_enabled: true,
    password_reset_enabled: false,
    invitation_code_enabled: false,
    turnstile_enabled: false,
    turnstile_site_key: '',
    site_name: 'Sub2API',
    site_logo: '',
    site_subtitle: '',
    api_base_url: '/api/v1',
    contact_info: '',
    doc_url: '',
    home_content: '',
    compact_home_enabled: false,
    hide_ccs_import_button: false,
    payment_enabled: false,
    table_default_page_size: 20,
    table_page_size_options: [10, 20, 50, 100],
    custom_menu_items: [],
    custom_endpoints: [],
    linuxdo_oauth_enabled: false,
    wechat_oauth_enabled: true,
    oidc_oauth_enabled: false,
    oidc_oauth_provider_name: 'OIDC',
    backend_mode_enabled: false,
    version: 'test',
    balance_low_notify_enabled: false,
    account_quota_notify_enabled: false,
    balance_low_notify_threshold: 0,
    ...overrides,
  }
}

function seedPublicSettings(overrides: Partial<WeChatPublicSettings> = {}): void {
  const appStore = useAppStore()
  const settings = buildPublicSettings(overrides)
  appStore.cachedPublicSettings = settings
  appStore.publicSettingsLoaded = true
}

describe('WechatOAuthSection native app hint i18n', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    routeState.query = { redirect: '/billing?plan=pro' }
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0')
    seedPublicSettings({
      wechat_oauth_open_enabled: false,
      wechat_oauth_mp_enabled: false,
      wechat_oauth_mobile_enabled: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['en', originalEnglishHint],
    ['zh', originalChineseHint],
    ['vi', vietnamese.auth.oauthFlow.wechatNativeAppRequired],
  ] as const)('renders the native-app-required hint in %s', async (locale, expectedHint) => {
    const i18n = createI18n({
      legacy: false,
      locale,
      fallbackLocale: 'en',
      messages: { en, zh, vi: vietnamese },
    })
    const wrapper = mount(WechatOAuthSection, {
      global: { plugins: [pinia, i18n] },
    })

    try {
      const hint = wrapper.get('[data-testid="wechat-oauth-hint"]').element.textContent?.trim()
      expect(typeof expectedHint).toBe('string')
      expect(hint).toBe(expectedHint)
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()
      expect(resolveWeChatOAuthStart).toHaveBeenCalledWith(useAppStore().cachedPublicSettings)
      if (locale === 'vi') {
        expect(hint).not.toMatch(/\p{Script=Han}/u)
        expect(hint).not.toBe(originalEnglishHint)
        expect(hint).toContain('WeChat SDK')
      }

      await wrapper.get('button').trigger('click')
      expect(wrapper.emitted('start')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })
})
