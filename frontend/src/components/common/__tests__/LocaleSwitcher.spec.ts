import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import LocaleSwitcher from '../LocaleSwitcher.vue'

enableAutoUnmount(afterEach)

const { setLocale, locale } = vi.hoisted(() => ({
  setLocale: vi.fn(),
  locale: { value: 'zh' }
}))

vi.mock('@/i18n', () => ({
  setLocale,
  availableLocales: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
  ]
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ locale }) }))

const reload = vi.fn()

const mountSwitcher = () =>
  mount(LocaleSwitcher, { global: { stubs: { Icon: true, transition: false } } })

const getOption = (wrapper: ReturnType<typeof mountSwitcher>, name: string) => {
  const option = wrapper.findAll('button').find((button) => button.text().includes(name))
  if (!option) throw new Error(`Language option "${name}" was not rendered`)
  return option
}

const choose = async (wrapper: ReturnType<typeof mountSwitcher>, name: string) => {
  await wrapper.get('button').trigger('click')
  await getOption(wrapper, name).trigger('click')
  await flushPromises()
}

function deferredSwitch() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    locale.value = 'zh'
    setLocale.mockReset().mockResolvedValue(undefined)
    reload.mockReset()
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // 分组名称等内容由后端按请求语言返回，已加载的数据要靠整页刷新换成新语言
  it('reloads the page after switching to another language', async () => {
    const wrapper = mountSwitcher()

    await choose(wrapper, 'English')

    expect(setLocale).toHaveBeenCalledWith('en')
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setLocale.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0])
  })

  it('does nothing when the current language is chosen again', async () => {
    const wrapper = mountSwitcher()

    await choose(wrapper, '中文')

    expect(setLocale).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('renders the Vietnamese option and reloads after selecting it', async () => {
    const wrapper = mountSwitcher()
    await wrapper.get('button').trigger('click')

    const option = getOption(wrapper, 'Tiếng Việt')
    expect(option.text()).toContain('Tiếng Việt')
    expect(option.text()).toContain('🇻🇳')

    await option.trigger('click')
    await flushPromises()

    expect(setLocale).toHaveBeenCalledWith('vi')
    expect(setLocale).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setLocale.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0])
  })

  it('waits for the Vietnamese switch to resolve before reloading', async () => {
    const pending = deferredSwitch()
    setLocale.mockReturnValueOnce(pending.promise)
    const wrapper = mountSwitcher()

    try {
      await choose(wrapper, 'Tiếng Việt')

      expect(setLocale).toHaveBeenCalledWith('vi')
      expect(setLocale).toHaveBeenCalledTimes(1)
      expect(reload).not.toHaveBeenCalled()
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()

      pending.resolve()
      await flushPromises()

      expect(reload).toHaveBeenCalledTimes(1)
      expect(setLocale.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0])
    } finally {
      pending.resolve()
      await flushPromises()
    }
  })

  it('shows Vietnamese as current and does nothing when it is chosen again', async () => {
    locale.value = 'vi'
    const wrapper = mountSwitcher()
    const trigger = wrapper.get('button')

    expect(trigger.attributes('title')).toBe('Tiếng Việt')
    expect(trigger.text()).toContain('VI')
    expect(trigger.text()).toContain('🇻🇳')

    await choose(wrapper, 'Tiếng Việt')

    expect(setLocale).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })
})
