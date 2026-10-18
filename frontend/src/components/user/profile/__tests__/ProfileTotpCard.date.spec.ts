import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ProfileTotpCard from '../ProfileTotpCard.vue'

const mocks = vi.hoisted(() => ({ getStatus: vi.fn(), locale: { value: 'en' } }))
vi.mock('@/api', () => ({ totpAPI: { getStatus: mocks.getStatus } }))
vi.mock('vue-i18n', async () => {
  const { ref } = await import('vue')
  mocks.locale = ref('en')
  return { useI18n: () => ({ t: (key: string) => key, locale: mocks.locale }) }
})
vi.mock('../TotpSetupModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../TotpDisableDialog.vue', () => ({ default: { template: '<div />' } }))

afterEach(() => { mocks.locale.value = 'en' })

describe('ProfileTotpCard enabled date', () => {
  it.each(['vi', 'zh', 'en'])('formats the enabled date with the current UI locale %s', async (locale) => {
    mocks.locale.value = locale
    const enabledAt = 1770000000
    mocks.getStatus.mockResolvedValue({ feature_enabled: true, enabled: true, enabled_at: enabledAt })
    const formatDate = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('X')
    let wrapper: ReturnType<typeof mount> | undefined
    try {
      wrapper = mount(ProfileTotpCard)
      await flushPromises()
      expect(wrapper.text()).toContain('profile.totp.enabledAt: X')
      expect(formatDate).toHaveBeenCalledWith(locale, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
      expect(formatDate.mock.contexts[0]?.getTime()).toBe(enabledAt * 1000)
    } finally {
      wrapper?.unmount()
      formatDate.mockRestore()
    }
  })
})
