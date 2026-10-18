import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountTestModal from '../AccountTestModal.vue'

const { getAvailableModels, copyToClipboard, getLocale, translate } = vi.hoisted(() => ({
  getAvailableModels: vi.fn(),
  copyToClipboard: vi.fn(),
  getLocale: vi.fn(() => 'en'),
  translate: vi.fn()
}))

vi.mock('@/i18n', () => ({ getLocale }))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    accounts: {
      getAvailableModels
    }
  }
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard
  })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  const messages: Record<string, string> = {
    'admin.accounts.imagePromptDefault': 'Generate a cute orange cat astronaut sticker on a clean pastel background.'
  }
  return {
    ...actual,
    useI18n: () => ({
      t: translate.mockImplementation((key: string, params?: Record<string, string | number>) => {
        if (key === 'admin.accounts.imageReceived' && params?.count) {
          return `received-${params.count}`
        }
        if (key === 'admin.accounts.imagePreviewAlt' && params?.index) {
          return `test-image-${params.index}`
        }
        if (key === 'admin.accounts.testHttpStatusError') {
          return `status-${params?.status}`
        }
        return messages[key] || key
      })
    })
  }
})

function createStreamResponse(lines: string[]) {
  const encoder = new TextEncoder()
  const chunks = lines.map((line) => encoder.encode(line))
  let index = 0

  return {
    ok: true,
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(async () => {
          if (index < chunks.length) {
            return { done: false, value: chunks[index++] }
          }
          return { done: true, value: undefined }
        })
      })
    }
  } as Response
}

function mountModal(account: Record<string, unknown> = {
  id: 42,
  name: 'Gemini Image Test',
  platform: 'gemini',
  type: 'apikey',
  status: 'active'
}) {
  return mount(AccountTestModal, {
    props: {
      show: false,
      account
    } as any,
    global: {
      stubs: {
        BaseDialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Select: { template: '<div class="select-stub"></div>' },
        TextArea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea class="textarea-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
        Icon: true
      }
    }
  })
}

describe('AccountTestModal', () => {
  beforeEach(() => {
    getLocale.mockReset().mockReturnValue('en')
    translate.mockClear()
    getAvailableModels.mockResolvedValue([
      { id: 'gemini-2.0-flash', display_name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-flash-image', display_name: 'Gemini 2.5 Flash Image' },
      { id: 'gemini-3.1-flash-image', display_name: 'Gemini 3.1 Flash Image' }
    ])
    copyToClipboard.mockReset()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => (key === 'auth_token' ? 'test-token' : null)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      configurable: true
    })
    global.fetch = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"type":"test_start","model":"gemini-2.5-flash-image"}\n',
        'data: {"type":"image","image_url":"data:image/png;base64,QUJD","mime_type":"image/png"}\n',
        'data: {"type":"test_complete","success":true}\n'
      ])
    ) as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gemini 图片模型测试会携带提示词并渲染图片预览', async () => {
    const wrapper = mountModal()
    await wrapper.setProps({ show: true })
    await flushPromises()

    const promptInput = wrapper.find('textarea.textarea-stub')
    expect(promptInput.exists()).toBe(true)
    await promptInput.setValue('draw a tiny orange cat astronaut')

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((button) => button.text().includes('admin.accounts.startTest'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, request] = (global.fetch as any).mock.calls[0]
    expect(JSON.parse(request.body)).toEqual({
      model_id: 'gemini-3.1-flash-image',
      prompt: 'draw a tiny orange cat astronaut'
    })

    const preview = wrapper.find('img[alt="test-image-1"]')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('src')).toBe('data:image/png;base64,QUJD')
  })

  it('grok 账号测试默认选择 Grok 模型', async () => {
    getAvailableModels.mockResolvedValue([
      { id: 'grok-4.3', display_name: 'Grok 4.3' },
      { id: 'grok-build-0.1', display_name: 'Grok Build 0.1' }
    ])
    global.fetch = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"type":"test_start","model":"grok-4.3"}\n',
        'data: {"type":"content","text":"ok"}\n',
        'data: {"type":"test_complete","success":true}\n'
      ])
    ) as any

    const wrapper = mountModal({
      id: 13,
      name: 'Grok Account',
      platform: 'grok',
      type: 'oauth',
      status: 'active'
    })
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((button) => button.text().includes('admin.accounts.startTest'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, request] = (global.fetch as any).mock.calls[0]
    expect(JSON.parse(request.body)).toEqual({
      model_id: 'grok-4.3',
      prompt: '',
      mode: 'text'
    })
  })

  it('OpenAI Compact 探测会携带 compact 测试模式', async () => {
    getAvailableModels.mockResolvedValue([
      { id: 'gpt-5.4', display_name: 'GPT-5.4' }
    ])
    global.fetch = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"type":"test_complete","success":true}\n'
      ])
    ) as any

    const wrapper = mountModal({
      id: 42,
      name: 'OpenAI OAuth',
      platform: 'openai',
      type: 'oauth',
      status: 'active'
    })
    await wrapper.setProps({ show: true })
    await flushPromises()

    ;(wrapper.vm as any).selectedModelId = 'gpt-5.4'
    ;(wrapper.vm as any).testMode = 'compact'
    await (wrapper.vm as any).startTest()
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, request] = (global.fetch as any).mock.calls[0]
    expect(JSON.parse(request.body)).toMatchObject({
      model_id: 'gpt-5.4',
      prompt: '',
      mode: 'compact'
    })
  })

  async function mountReadyModal() {
    const wrapper = mountModal()
    await wrapper.setProps({ show: true })
    await flushPromises()
    return wrapper
  }

  it('reads vi, zh and en at request time while preserving admin and authorization headers', async () => {
    global.fetch = vi.fn().mockImplementation(async () => createStreamResponse([
      'data: {"type":"test_complete","success":true}\n'
    ]))
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any
    const fetchMock = vi.mocked(global.fetch)

    for (const [index, locale] of ['vi', 'zh', 'en'].entries()) {
      getLocale.mockReturnValue(locale)
      await flushPromises()
      expect(fetchMock).toHaveBeenCalledTimes(index)

      await vm.startTest()
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledTimes(index + 1)
      const [, request] = fetchMock.mock.calls[index]
      expect(request?.headers).toStrictEqual({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        'X-Admin-UI-Request': '1'
      })
      expect(vm.status).toBe('success')
    }
  })

  it.each([
    { name: 'surrounding whitespace', message: '  Raw {message}: tiếng Việt / 中文  ' },
    { name: 'whitespace-only message', message: ' \t ' }
  ])('preserves exact non-2xx message bytes with $name in the error prefix', async ({ message }) => {
    const json = vi.fn().mockResolvedValue({ message })
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 423, json })
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('error')
    expect(vm.errorMessage).toBe(message)
    expect(translate).toHaveBeenCalledWith('admin.accounts.errorPrefix', { message })
    expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
      { text: 'admin.accounts.errorPrefix', class: 'text-red-400' }
    ])
    expect(json).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  const invalidPayloads: { name: string; payload?: unknown; failure?: Error }[] = [
    { name: 'missing message', payload: {} },
    { name: 'empty message', payload: { message: '' } },
    { name: 'numeric message', payload: { message: 17 } },
    { name: 'boolean message', payload: { message: false } },
    { name: 'object message', payload: { message: { text: 'Not a message' } } },
    { name: 'array message', payload: { message: ['Not a message'] } },
    { name: 'null message', payload: { message: null } },
    { name: 'array payload', payload: [{ message: 'Not a top-level message' }] },
    { name: 'null payload', payload: null },
    { name: 'string payload', payload: 'Not an envelope' },
    { name: 'numeric payload', payload: 502 },
    { name: 'boolean payload', payload: false },
    { name: 'nested error.message', payload: { error: { message: 'Not a top-level message' } } },
    { name: 'plain Error JSON rejection', failure: new Error('Invalid JSON fixture') },
    { name: 'plain Error named AbortError', failure: Object.assign(new Error('Plain abort fixture'), { name: 'AbortError' }) }
  ]

  it.each(invalidPayloads)('uses the translated HTTP status for $name', async ({ payload, failure }) => {
    const json = failure ? vi.fn().mockRejectedValue(failure) : vi.fn().mockResolvedValue(payload)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, json })
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('error')
    expect(vm.errorMessage).toBe('status-502')
    expect(translate).toHaveBeenCalledWith('admin.accounts.testHttpStatusError', { status: 502 })
    expect(translate).toHaveBeenCalledWith('admin.accounts.errorPrefix', { message: 'status-502' })
    expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
      { text: 'admin.accounts.errorPrefix', class: 'text-red-400' }
    ])
    expect(json).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('keeps DOMException AbortError during non-2xx JSON parsing idle and silent', async () => {
    const json = vi.fn().mockRejectedValue(new DOMException('Abort fixture', 'AbortError'))
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json })
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('idle')
    expect(vm.errorMessage).toBe('')
    expect(vm.outputLines.some((line: any) => line.class === 'text-red-400')).toBe(false)
    expect(translate).not.toHaveBeenCalledWith('admin.accounts.errorPrefix', expect.anything())
    expect(json).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
