import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useI18n } from 'vue-i18n'
import type { UsageLog } from '@/types'
import UserDashboardRecentUsage from '../UserDashboardRecentUsage.vue'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  const { ref } = await import('vue')
  const locale = ref('en')
  return {
    ...actual,
    useI18n: () => ({
      locale,
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key,
    }),
  }
})

const { locale } = useI18n()

afterEach(() => {
  locale.value = 'en'
  vi.restoreAllMocks()
})

describe('UserDashboardRecentUsage', () => {
  it.each(['vi', 'zh', 'en'])('translates token counts using locale %s', (currentLocale) => {
    locale.value = currentLocale
    const numberSpy = vi.spyOn(Number.prototype, 'toLocaleString').mockReturnValue('N')
    const log = {
      id: 1,
      model: 'test-model',
      created_at: '2026-10-18T12:00:00Z',
      actual_cost: 0.01,
      total_cost: 0.02,
      input_tokens: 1234,
      output_tokens: 5678,
    } as unknown as UsageLog
    const w = mount(UserDashboardRecentUsage, {
      props: { data: [log], loading: false },
      global: { stubs: { LoadingSpinner: true, EmptyState: true, Icon: true, RouterLink: true } },
    })

    expect(w.text()).toContain('dashboard.tokensCount:{"count":"N"}')
    expect(numberSpy).toHaveBeenCalledTimes(1)
    expect(numberSpy).toHaveBeenCalledWith(currentLocale)
    expect(Number(numberSpy.mock.contexts[0])).toBe(log.input_tokens + log.output_tokens)
  })
})
