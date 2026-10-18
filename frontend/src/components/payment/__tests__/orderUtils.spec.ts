import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import type { PaymentOrder } from '@/types/payment'
import OrderTable from '../OrderTable.vue'
import { formatOrderDateTime } from '../orderUtils'

const i18nState = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@/i18n', () => ({ getLocale: () => i18nState.locale }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  const { ref } = await import('vue')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key, locale: ref(i18nState.locale) })
  }
})

enableAutoUnmount(afterEach)
afterEach(() => {
  i18nState.locale = 'en'
  vi.restoreAllMocks()
})

describe('formatOrderDateTime', () => {
  it('keeps an empty date unavailable without invoking the formatter', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('formatted date')

    expect(formatOrderDateTime('')).toBe('-')
    expect(spy).not.toHaveBeenCalled()
  })

  it.each(['vi', 'zh', 'en'])('formats dates using the %s interface locale', (locale) => {
    i18nState.locale = locale
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('formatted date')

    expect(formatOrderDateTime('2026-10-17T08:09:10Z')).toBe('formatted date')
    expect(spy).toHaveBeenCalledWith(locale)
  })
})

describe('OrderTable date locale', () => {
  it.each(['vi', 'zh', 'en'])('renders the creation date using the %s interface locale', (locale) => {
    i18nState.locale = locale
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('formatted creation date')
    const order = { id: 1, created_at: '2026-10-17T08:09:10Z' } as PaymentOrder
    const wrapper = mount(OrderTable, {
      props: { orders: [order], loading: false },
      global: { stubs: {
        DataTable: {
          props: ['columns', 'data', 'loading'],
          template: '<div v-for="row in data" :key="row.id"><slot name="cell-created_at" :value="row.created_at" /></div>'
        },
        OrderStatusBadge: true
      } }
    })

    expect(spy).toHaveBeenCalledWith(locale)
    expect(wrapper.text()).toContain('formatted creation date')
  })
})
