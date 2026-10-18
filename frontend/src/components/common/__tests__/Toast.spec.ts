import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/stores/app'
import Toast from '../Toast.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
  getLocale: () => 'en',
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
})

const mountToast = () => {
  const appStore = useAppStore()
  appStore.showToast('info', 'Test notification')
  const wrapper = mount(Toast, {
    global: {
      stubs: { Teleport: true, TransitionGroup: true, Icon: true },
    },
  })
  return { appStore, wrapper }
}

describe('Toast accessibility', () => {
  it('uses the translated close notification label', () => {
    const { wrapper } = mountToast()

    expect(wrapper.get('button').attributes('aria-label')).toBe('common.accessibility.closeNotification')
  })

  it('preserves the original notification message', () => {
    const { wrapper } = mountToast()

    expect(wrapper.get('p').text()).toBe('Test notification')
  })

  it('removes the toast from the store and DOM when the close button is clicked', async () => {
    const { appStore, wrapper } = mountToast()
    expect(appStore.toasts).toHaveLength(1)
    expect(wrapper.get('p').text()).toBe('Test notification')

    await wrapper.get('button').trigger('click')

    expect(appStore.toasts).toEqual([])
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Test notification')
  })
})
