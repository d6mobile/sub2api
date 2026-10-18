import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import OpsDashboardHeader from '../OpsDashboardHeader.vue'
import type { OpsDashboardOverview } from '@/api/admin/ops'

const i18nState = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@/api', () => ({ adminAPI: { groups: { getAll: vi.fn().mockResolvedValue([]) } } }))
vi.mock('@/api/admin/ops', () => ({ opsAPI: { getRealtimeTrafficSummary: vi.fn().mockResolvedValue({ enabled: true, summary: null }) } }))
vi.mock('@/stores', () => ({ useAdminSettingsStore: () => ({ opsRealtimeMonitoringEnabled: true, setOpsRealtimeMonitoringEnabledLocal: vi.fn() }) }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  const { ref } = await import('vue')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key,
      locale: ref(i18nState.locale)
    })
  }
})

const dateSpies: Array<{ mockRestore: () => void }> = []

enableAutoUnmount(afterEach)
afterEach(() => {
  i18nState.locale = 'en'
  while (dateSpies.length) dateSpies.pop()!.mockRestore()
})

const overview = { tps: { avg: 242.7 } } as OpsDashboardOverview
function mountHeader(value = overview, options: { lastUpdated?: Date; renderDialogs?: boolean } = {}) {
  return mount(OpsDashboardHeader, {
    props: { overview: value, platform: '', groupId: null, timeRange: '1h', queryMode: 'auto', loading: false, lastUpdated: options.lastUpdated ?? null },
    global: { stubs: {
      Select: true, HelpTooltip: true, Icon: true,
      BaseDialog: options.renderDialogs ? { props: ['show'], template: '<div v-if="show"><slot /></div>' } : true
    } }
  })
}

describe('OpsDashboardHeader date locale', () => {
  it.each([
    ['vi', 'vi-VN'],
    ['zh', 'zh-CN'],
    ['en', 'zh-CN']
  ])('formats lastUpdated for %s without changing the existing en/zh layout', async (locale, expectedLocale) => {
    i18nState.locale = locale
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('2026/10/17 08:09:10')
    dateSpies.push(spy)
    const wrapper = mountHeader(overview, { lastUpdated: new Date('2026-10-17T08:09:10Z') })
    await flushPromises()

    expect(spy).toHaveBeenCalledWith(expectedLocale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    expect(wrapper.text()).toContain('common.refresh: 2026-10-17 08:09:10')
  })

  it.each(['vi', 'zh', 'en'])('formats heartbeat times using the %s interface locale', async (locale) => {
    i18nState.locale = locale
    const spy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('08:09:10')
    dateSpies.push(spy)
    const wrapper = mountHeader({
      ...overview,
      job_heartbeats: [{
        job_name: 'test-job',
        updated_at: '2026-10-17T08:09:10Z',
        last_success_at: '2026-10-17T08:08:10Z',
        last_error_at: '2026-10-17T08:07:10Z'
      }]
    } as OpsDashboardOverview, { renderDialogs: true })
    await flushPromises()
    const detailsButton = wrapper.findAll('button').find(button =>
      button.text() === 'admin.ops.requestDetails.details' && button.element.parentElement?.textContent?.includes('admin.ops.jobs')
    )!
    await detailsButton.trigger('click')

    expect(spy).toHaveBeenCalledTimes(3)
    for (const args of spy.mock.calls) {
      expect(args).toEqual([locale])
    }
    expect(wrapper.text()).toContain('08:09:10')
  })
})

describe('OpsDashboardHeader output TPS', () => {

  it('shows per-request P50, slower-tail percentiles and sample count separately from traffic TPS', async () => {
    const wrapper = mountHeader({ ...overview, output_tps: { p5: 2.35, p10: 3.7, p50: 55, avg: 277.75, sample_count: 4 } })
    await flushPromises()
    const card = wrapper.get('[data-testid="output-tps-card"]')
    expect(card.get('[data-testid="output-tps-p50"]').text()).toBe('55.0')
    expect(card.get('[data-testid="output-tps-p5"]').text()).toBe('2.4')
    expect(card.get('[data-testid="output-tps-p10"]').text()).toBe('3.7')
    expect(card.get('[data-testid="output-tps-avg"]').text()).toBe('277.8')
    expect(card.get('[data-testid="output-tps-samples"]').text()).toContain('4')
    expect(card.text()).toContain('tok/s (P50)')
    expect(card.text()).not.toContain('242.7')
    await wrapper.setProps({ fullscreen: true, overview: { ...overview, output_tps: { p5: 0.01, p10: 0.02, p50: 0.04, avg: 0.05, sample_count: 1 } } })
    expect(card.get('[data-testid="output-tps-p50"]').text()).toBe('0.0')
    expect(card.get('[data-testid="output-tps-samples"]').text()).toContain('1')
    wrapper.unmount()
  })

  it.each([undefined, null, { p5: null, p10: null, p50: null, avg: null, sample_count: 0 }])('shows missing output TPS as unavailable, not zero: %s', async (output_tps) => {
    const wrapper = mountHeader({ ...overview, output_tps })
    await flushPromises()
    for (const metric of ['p5', 'p10', 'p50', 'avg']) {
      expect(wrapper.get(`[data-testid="output-tps-${metric}"]`).text()).toBe('—')
    }
    expect(wrapper.get('[data-testid="output-tps-samples"]').text()).toContain(output_tps == null ? '—' : '0')
    wrapper.unmount()
  })

})
