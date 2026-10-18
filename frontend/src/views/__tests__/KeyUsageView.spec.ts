import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import KeyUsageView from '../KeyUsageView.vue'

const { showInfo, showSuccess, showError, fetchPublicSettings, getLocale, mockLocale } = vi.hoisted(() => ({
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  fetchPublicSettings: vi.fn(),
  getLocale: vi.fn(() => 'en'),
  mockLocale: { value: 'en' },
}))

vi.mock('@/i18n', () => ({ getLocale }))
vi.mock('@/api/client', () => ({
  buildGatewayUrl: (path: string) => `/gateway${path}`,
}))
vi.mock('@/components/common/LocaleSwitcher.vue', () => ({
  default: { name: 'LocaleSwitcher', template: '<span />' },
}))

const messages: Record<string, string> = {
  'keyUsage.title': 'API Key Usage',
  'keyUsage.subtitle': 'Usage status',
  'keyUsage.placeholder': 'sk-test',
  'keyUsage.query': 'Query',
  'keyUsage.querying': 'Querying...',
  'keyUsage.privacyNote': 'Privacy note',
  'keyUsage.dateRange': 'Date Range:',
  'keyUsage.dateRangeToday': 'Today',
  'keyUsage.dateRange7d': '7 Days',
  'keyUsage.dateRange30d': '30 Days',
  'keyUsage.dateRange90d': '90 Days',
  'keyUsage.dateRangeCustom': 'Custom',
  'keyUsage.apply': 'Apply',
  'keyUsage.used': 'Used',
  'keyUsage.detailInfo': 'Detail Information',
  'keyUsage.tokenStats': 'Token Statistics',
  'keyUsage.dailyDetail': 'Daily Detail',
  'keyUsage.date': 'Date',
  'keyUsage.requests': 'Requests',
  'keyUsage.inputTokens': 'Input Tokens',
  'keyUsage.outputTokens': 'Output Tokens',
  'keyUsage.cacheReadTokens': 'Cache Read',
  'keyUsage.cacheWriteTokens': 'Cache Write',
  'keyUsage.cost': 'Cost',
  'keyUsage.quotaMode': 'Key Quota Mode',
  'keyUsage.walletBalance': 'Wallet Balance',
  'keyUsage.totalQuota': 'Total Quota',
  'keyUsage.limit5h': '5-Hour Limit',
  'keyUsage.limitDaily': 'Daily Limit',
  'keyUsage.limit7d': '7-Day Limit',
  'keyUsage.limitWeekly': 'Weekly Limit',
  'keyUsage.limitMonthly': 'Monthly Limit',
  'keyUsage.remainingQuota': 'Remaining Quota',
  'keyUsage.usedQuota': 'Used Quota',
  'keyUsage.quotaUnitDay': 'D',
  'keyUsage.quotaUnitWeek': 'W',
  'keyUsage.quotaUnitMonth': 'M',
  'keyUsage.subscriptionType': 'Subscription Type',
  'keyUsage.billingType': 'Billing Type',
  'keyUsage.todayRequests': 'Today Requests',
  'keyUsage.todayInputTokens': 'Today Input',
  'keyUsage.todayOutputTokens': 'Today Output',
  'keyUsage.todayTokens': 'Today Tokens',
  'keyUsage.todayCacheCreation': 'Today Cache Creation',
  'keyUsage.todayCacheRead': 'Today Cache Read',
  'keyUsage.todayCost': 'Today Cost',
  'keyUsage.rpmTpm': 'RPM / TPM',
  'keyUsage.totalRequests': 'Total Requests',
  'keyUsage.totalInputTokens': 'Total Input',
  'keyUsage.totalOutputTokens': 'Total Output',
  'keyUsage.totalTokensLabel': 'Total Tokens',
  'keyUsage.totalCacheCreation': 'Total Cache Creation',
  'keyUsage.totalCacheRead': 'Total Cache Read',
  'keyUsage.totalCost': 'Total Cost',
  'keyUsage.avgDuration': 'Avg Duration',
  'keyUsage.querySuccess': 'Query successful',
  'keyUsage.queryFailed': 'Query failed',
  'keyUsage.queryFailedRetry': 'Query failed, please try again later',
  'home.viewDocs': 'Docs',
  'home.switchToLight': 'Light',
  'home.switchToDark': 'Dark',
  'home.footer.allRightsReserved': 'All rights reserved.',
}

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => messages[key] ?? key,
      locale: mockLocale,
    }),
  }
})

const appStoreState = vi.hoisted(() => ({
  cachedPublicSettings: null as Record<string, unknown> | null,
}))

vi.mock('@/stores', () => ({
  useAppStore: () => ({
    get cachedPublicSettings() {
      return appStoreState.cachedPublicSettings
    },
    siteName: 'Sub2API',
    siteLogo: '',
    docUrl: '',
    publicSettingsLoaded: true,
    fetchPublicSettings,
    showInfo,
    showSuccess,
    showError,
  }),
}))

afterEach(() => {
  mockLocale.value = 'en'
  messages['keyUsage.quotaUnitDay'] = 'D'
  messages['keyUsage.quotaUnitWeek'] = 'W'
  messages['keyUsage.quotaUnitMonth'] = 'M'
})

describe('KeyUsageView daily detail', () => {
  beforeEach(() => {
    showInfo.mockReset()
    showSuccess.mockReset()
    showError.mockReset()
    fetchPublicSettings.mockReset()
    getLocale.mockReset().mockReturnValue('en')
    localStorage.clear()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'quota_limited',
        isValid: true,
        status: 'active',
        quota: {
          limit: 10,
          used: 1,
          remaining: 9,
          unit: 'USD',
        },
        usage: {
          today: {
            requests: 1,
            input_tokens: 10,
            output_tokens: 20,
            cache_creation_tokens: 0,
            cache_read_tokens: 0,
            total_tokens: 30,
            actual_cost: 0.01,
          },
          total: {
            requests: 12,
            input_tokens: 100,
            output_tokens: 200,
            cache_creation_tokens: 10,
            cache_read_tokens: 30,
            total_tokens: 340,
            actual_cost: 0.12,
          },
          rpm: 0,
          tpm: 0,
        },
        daily_usage: [
          {
            date: '2026-05-19',
            requests: 12,
            input_tokens: 100,
            output_tokens: 200,
            cache_read_tokens: 30,
            cache_write_tokens: 10,
            total_tokens: 340,
            cost: 0.15,
            actual_cost: 0.12,
          },
        ],
      }),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders daily usage detail rows after a successful query', async () => {
    const wrapper = mount(KeyUsageView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          LocaleSwitcher: true,
          Icon: true,
        },
      },
    })

    await wrapper.find('input').setValue('sk-test-key')
    await wrapper.find('input').trigger('keydown.enter')
    await flushPromises()
    await nextTick()

    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/usage?'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-test-key', 'Accept-Language': 'en' },
      })
    )
    expect(String(fetchMock.mock.calls[0][0])).toContain('days=30')

    const text = wrapper.text()
    expect(text).toContain('Daily Detail')
    expect(text).toContain('Date')
    expect(text).toContain('Cache Read')
    expect(text).toContain('Cache Write')
    expect(text).toContain('2026-05-19')
    expect(text).toContain('12')
    expect(text).toContain('100')
    expect(text).toContain('200')
    expect(text).toContain('30')
    expect(text).toContain('10')
    expect(text).toContain('$0.12')

    wrapper.unmount()
  })

  function mountUsageView() {
    return mount(KeyUsageView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          LocaleSwitcher: true,
          Icon: true,
        },
      },
    })
  }

  it.each([
    { period: 'daily', unit: 'Ngày' },
    { period: 'weekly', unit: 'Tuần' },
    { period: 'monthly', unit: 'Tháng' },
  ])('translates the $period subscription quota unit', async ({ unit }) => {
    messages['keyUsage.quotaUnitDay'] = 'Ngày'
    messages['keyUsage.quotaUnitWeek'] = 'Tuần'
    messages['keyUsage.quotaUnitMonth'] = 'Tháng'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mode: 'wallet',
        subscription: {
          daily_limit_usd: 10, daily_usage_usd: 1,
          weekly_limit_usd: 50, weekly_usage_usd: 5,
          monthly_limit_usd: 200, monthly_usage_usd: 20,
        },
      }),
    } as Response)
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('sk-test-key')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      expect(wrapper.text()).toContain(`Used Quota (${unit})`)
    } finally {
      wrapper.unmount()
    }
  })

  it('translates the 1d rate-limit unit without changing other windows', async () => {
    messages['keyUsage.quotaUnitDay'] = 'Ngày'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mode: 'quota_limited',
        rate_limits: ['5h', '1d', '7d', 'custom'].map(window => ({ window, limit: 10, used: 1 })),
      }),
    } as Response)
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('sk-test-key')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      for (const unit of ['5H', 'Ngày', '7D', 'custom']) {
        expect(wrapper.text()).toContain(`Used Quota (${unit})`)
      }
    } finally {
      wrapper.unmount()
    }
  })

  it.each([
    { selectedLocale: 'vi', dateLocale: 'vi-VN', mode: 'quota_limited' },
    { selectedLocale: 'zh', dateLocale: 'zh-CN', mode: 'quota_limited' },
    { selectedLocale: 'en', dateLocale: 'en-US', mode: 'quota_limited' },
    { selectedLocale: 'vi', dateLocale: 'vi-VN', mode: 'wallet' },
    { selectedLocale: 'zh', dateLocale: 'zh-CN', mode: 'wallet' },
    { selectedLocale: 'en', dateLocale: 'en-US', mode: 'wallet' },
  ])('formats $mode expiry dates with $dateLocale for $selectedLocale', async ({ selectedLocale, dateLocale, mode }) => {
    mockLocale.value = selectedLocale
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('localized-expiry')
    const expires_at = '2030-06-15T12:00:00Z'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mode,
        ...(mode === 'quota_limited' ? { expires_at } : { subscription: { expires_at } }),
      }),
    } as Response)
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('sk-test-key')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      expect(wrapper.text()).toContain('localized-expiry')
      expect(dateSpy).toHaveBeenCalledWith(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })
    } finally {
      wrapper.unmount()
      dateSpy.mockRestore()
    }
  })

  it.each(['vi', 'zh', 'en'])('formats usage numbers with getLocale() returning %s', async (selectedLocale) => {
    getLocale.mockReturnValue(selectedLocale)
    const numberSpy = vi.spyOn(Number.prototype, 'toLocaleString')
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('sk-test-key')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      expect(wrapper.text()).toContain('Token Statistics')
      expect(numberSpy).toHaveBeenCalledWith(selectedLocale)
    } finally {
      wrapper.unmount()
      numberSpy.mockRestore()
    }
  })

  it.each(['en', 'vi', 'zh'])('sends the selected %s locale with the trimmed API key', async (selectedLocale) => {
    getLocale.mockReturnValue(selectedLocale)
    localStorage.setItem('auth_token', 'unrelated-session-token-fixture')
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('  api-key-fixture  ')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      const fetchMock = vi.mocked(fetch)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/gateway\/v1\/usage\?/),
        { headers: { Authorization: 'Bearer api-key-fixture', 'Accept-Language': selectedLocale } },
      )
      expect(String(fetchMock.mock.calls[0][0])).toContain('days=30')
      expect(getLocale).toHaveBeenCalledWith()
      expect(showSuccess).toHaveBeenCalledTimes(1)
      expect(showSuccess).toHaveBeenCalledWith('Query successful')
      expect(showError).not.toHaveBeenCalled()
      expect(localStorage.getItem('auth_token')).toBe('unrelated-session-token-fixture')
    } finally {
      wrapper.unmount()
    }
  })

  it('reads locale changes only when querying again in the same mounted instance', async () => {
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('  api-key-fixture  ')
      const fetchMock = vi.mocked(fetch)

      for (const [index, selectedLocale] of ['vi', 'zh', 'en'].entries()) {
        getLocale.mockReturnValue(selectedLocale)
        await nextTick()
        await flushPromises()
        expect(fetchMock).toHaveBeenCalledTimes(index)

        await wrapper.find('input').trigger('keydown.enter')
        await flushPromises()
        await nextTick()

        expect(fetchMock).toHaveBeenCalledTimes(index + 1)
        expect(fetchMock.mock.calls[index]).toStrictEqual([
          expect.stringMatching(/^\/gateway\/v1\/usage\?/),
          { headers: { Authorization: 'Bearer api-key-fixture', 'Accept-Language': selectedLocale } },
        ])
        expect(String(fetchMock.mock.calls[index][0])).toContain('days=30')
      }

      expect(getLocale).toHaveBeenCalledWith()
      expect(showSuccess).toHaveBeenCalledTimes(3)
      expect(showSuccess).toHaveBeenCalledWith('Query successful')
      expect(showError).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
    }
  })

  it.each([
    {
      name: 'preserves nested error messages ahead of top-level messages',
      status: 400,
      body: { error: { message: 'Raw nested error fixture' }, message: 'Different top-level message' },
      invalidJson: false,
      message: 'Raw nested error fixture',
    },
    {
      name: 'preserves top-level error messages without a nested message',
      status: 403,
      body: { message: 'Raw top-level error fixture' },
      invalidJson: false,
      message: 'Raw top-level error fixture',
    },
    {
      name: 'preserves the translated fallback for non-JSON errors',
      status: 502,
      body: undefined,
      invalidJson: true,
      message: 'Query failed (502)',
    },
  ])('$name', async ({ status, body, invalidJson, message }) => {
    getLocale.mockReturnValue('vi')
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status,
      json: invalidJson
        ? vi.fn().mockRejectedValue(new SyntaxError('Non-JSON fixture'))
        : vi.fn().mockResolvedValue(body),
    } as unknown as Response)
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('  api-key-fixture  ')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      expect(showError).toHaveBeenCalledTimes(1)
      expect(showError).toHaveBeenCalledWith(message)
      expect(showSuccess).not.toHaveBeenCalled()
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringMatching(/^\/gateway\/v1\/usage\?/),
        { headers: { Authorization: 'Bearer api-key-fixture', 'Accept-Language': 'vi' } },
      )
    } finally {
      wrapper.unmount()
    }
  })

  it('preserves fetch rejection messages without retrying', async () => {
    getLocale.mockReturnValue('vi')
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network-fixture'))
    const wrapper = mountUsageView()

    try {
      await wrapper.find('input').setValue('  api-key-fixture  ')
      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()
      await nextTick()

      expect(showError).toHaveBeenCalledTimes(1)
      expect(showError).toHaveBeenCalledWith('network-fixture')
      expect(showSuccess).not.toHaveBeenCalled()
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringMatching(/^\/gateway\/v1\/usage\?/),
        { headers: { Authorization: 'Bearer api-key-fixture', 'Accept-Language': 'vi' } },
      )
    } finally {
      wrapper.unmount()
    }
  })

  it('queries the current local calendar date near midnight', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 13, 0, 30))

    const wrapper = mount(KeyUsageView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          LocaleSwitcher: true,
          Icon: true,
        },
      },
    })

    await wrapper.find('input').setValue('sk-test-key')
    await wrapper.find('input').trigger('keydown.enter')
    await flushPromises()

    const requestUrl = String(vi.mocked(fetch).mock.calls[0][0])
    expect(requestUrl).toContain('start_date=2026-07-13')
    expect(requestUrl).toContain('end_date=2026-07-13')

    wrapper.unmount()
  })
})

describe('KeyUsageView subscription feature flag', () => {
  beforeEach(() => {
    getLocale.mockReset().mockReturnValue('en')
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'wallet',
        isValid: true,
        status: 'active',
        balance: 5.5,
        usage: {
          today: { requests: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, total_tokens: 0, actual_cost: 0 },
          total: { requests: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, total_tokens: 0, actual_cost: 0 },
          rpm: 0,
          tpm: 0,
        },
        daily_usage: [],
      }),
    }))
  })

  afterEach(() => {
    appStoreState.cachedPublicSettings = null
    vi.unstubAllGlobals()
  })

  async function mountAndQuery() {
    const wrapper = mount(KeyUsageView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          LocaleSwitcher: true,
          Icon: true,
        },
      },
    })
    await wrapper.find('input').setValue('sk-test-key')
    await wrapper.find('input').trigger('keydown.enter')
    await flushPromises()
    await nextTick()
    return wrapper
  }

  it('labels the wallet row "Subscription Type" while subscriptions are enabled', async () => {
    const wrapper = await mountAndQuery()

    expect(wrapper.text()).toContain('Subscription Type')
    expect(wrapper.text()).toContain('Wallet Balance')
    wrapper.unmount()
  })

  it('drops the "Subscription" wording from the wallet row when subscriptions are disabled', async () => {
    appStoreState.cachedPublicSettings = { subscription_enabled: false }
    const wrapper = await mountAndQuery()

    expect(wrapper.text()).toContain('Billing Type')
    expect(wrapper.text()).not.toContain('Subscription Type')
    expect(wrapper.text()).toContain('Wallet Balance')
    wrapper.unmount()
  })
})
