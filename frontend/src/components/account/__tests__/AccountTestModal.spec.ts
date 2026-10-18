import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AccountTestModal from '../AccountTestModal.vue'

enableAutoUnmount(afterEach)

const { getAvailableModelsMock, getLocale } = vi.hoisted(() => ({
  getAvailableModelsMock: vi.fn(),
  getLocale: vi.fn(() => 'en')
}))

vi.mock('@/i18n', () => ({ getLocale }))

const messages: Record<string, Record<string, string>> = {
  en: {
    'admin.accounts.testHttpStatusError': 'HTTP error! status: {status}',
    'admin.accounts.legacyTest.noResponseBody': 'No response body',
    'admin.accounts.legacyTest.unknownError': 'Unknown error',
    'admin.accounts.legacyTest.errorPrefix': 'Error: {message}',
    'admin.accounts.legacyTest.testFailed': 'Test failed'
  },
  zh: {
    'admin.accounts.testHttpStatusError': 'HTTP error! status: {status}',
    'admin.accounts.legacyTest.noResponseBody': 'No response body',
    'admin.accounts.legacyTest.unknownError': 'Unknown error',
    'admin.accounts.legacyTest.errorPrefix': 'Error: {message}',
    'admin.accounts.legacyTest.testFailed': 'Test failed'
  },
  vi: {
    'admin.accounts.testHttpStatusError': 'Lỗi HTTP! Mã trạng thái: {status}',
    'admin.accounts.legacyTest.noResponseBody': 'Không có nội dung phản hồi',
    'admin.accounts.legacyTest.unknownError': 'Lỗi không xác định',
    'admin.accounts.legacyTest.errorPrefix': 'Lỗi: {message}',
    'admin.accounts.legacyTest.testFailed': 'Kiểm tra thất bại'
  }
}

vi.mock('@/api/admin', () => ({
  adminAPI: {
    accounts: {
      getAvailableModels: getAvailableModelsMock
    }
  }
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn()
  })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params: Record<string, unknown> = {}) => {
        const template = messages[getLocale()]?.[key] ?? key
        return template.replace(/\{(\w+)\}/g, (match, name: string) => (
          name in params ? String(params[name]) : match
        ))
      }
    })
  }
})

const BaseDialogStub = defineComponent({
  name: 'BaseDialog',
  props: { show: { type: Boolean, default: false } },
  template: '<div v-if="show"><slot /><slot name="footer" /></div>'
})

const SelectStub = defineComponent({
  name: 'SelectStub',
  props: {
    modelValue: { type: [String, Number, Boolean, null], default: '' },
    options: { type: Array, default: () => [] },
    valueKey: { type: String, default: 'value' },
    labelKey: { type: String, default: 'label' }
  },
  emits: ['update:modelValue'],
  template: `
    <select
      v-bind="$attrs"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="option in options"
        :key="option[valueKey]"
        :value="option[valueKey]"
      >
        {{ option[labelKey] }}
      </option>
    </select>
  `
})

const TextAreaStub = defineComponent({
  name: 'TextArea',
  props: {
    modelValue: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  template: `
    <textarea
      v-bind="$attrs"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `
})

function buildAccount() {
  return {
    id: 1,
    name: 'OpenAI OAuth',
    platform: 'openai',
    type: 'oauth',
    status: 'active',
    credentials: {},
    extra: {},
    concurrency: 1,
    priority: 1,
    proxy_id: null,
    auto_pause_on_expired: false
  } as any
}

describe('AccountTestModal', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    getLocale.mockReset().mockReturnValue('en')
    getAvailableModelsMock.mockReset()
    getAvailableModelsMock.mockResolvedValue([
      { id: 'gpt-5.4', display_name: 'GPT-5.4' }
    ])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined })
        })
      }
    } as any)
    localStorage.setItem('auth_token', 'test-token')
  })

  afterEach(() => {
    global.fetch = originalFetch
    localStorage.clear()
    vi.restoreAllMocks()
  })

  async function mountReadyModal() {
    const wrapper = mount(AccountTestModal, {
      props: { show: true, account: buildAccount() },
      global: {
        stubs: {
          BaseDialog: BaseDialogStub,
          Select: SelectStub,
          TextArea: TextAreaStub,
          Icon: true
        }
      }
    })
    await flushPromises()
    ;(wrapper.vm as any).selectedModelId = 'gpt-5.4'
    return wrapper
  }

  function streamResponse(events: Record<string, unknown>[]) {
    const bytes = new TextEncoder().encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''))
    const chunks: Uint8Array[] = []
    for (let offset = 0; offset < bytes.length; offset += 11) {
      chunks.push(bytes.slice(offset, offset + 11))
    }
    return {
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('Unexpected JSON parsing of an SSE response')),
      body: {
        getReader: vi.fn().mockReturnValue({
          read: vi.fn().mockImplementation(async () => (
            chunks.length ? { done: false, value: chunks.shift() } : { done: true, value: undefined }
          ))
        })
      }
    }
  }

  it('reads vi, zh and en at request time in the same mounted instance', async () => {
    const responses = ['vi', 'zh', 'en'].map(() => streamResponse([{ type: 'test_complete', success: true }]))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2])
    global.fetch = fetchMock
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any
    vm.testMode = 'compact'
    vm.testPrompt = '  ignored for a text model  '
    let previousSignal: AbortSignal | undefined

    for (const [index, locale] of ['vi', 'zh', 'en'].entries()) {
      getLocale.mockReturnValue(locale)
      await flushPromises()
      expect(fetchMock).toHaveBeenCalledTimes(index)
      await vm.startTest()
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledTimes(index + 1)
      const [url, options] = fetchMock.mock.calls[index]
      expect(url).toMatch(/\/admin\/accounts\/1\/test$/)
      expect(options).toStrictEqual({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'Accept-Language': locale
        },
        body: JSON.stringify({ model_id: 'gpt-5.4', prompt: '', mode: 'compact' }),
        signal: expect.any(AbortSignal)
      })
      expect(options.headers['X-Admin-UI-Request']).toBeUndefined()
      expect(options.signal.aborted).toBe(false)
      if (previousSignal) expect(previousSignal.aborted).toBe(true)
      previousSignal = options.signal
      expect(vm.status).toBe('success')
      expect(responses[index].json).not.toHaveBeenCalled()
      expect(localStorage.getItem('auth_token')).toBe('test-token')
    }
  })

  it.each([
    { locale: 'vi', status: 423, code: 'ADMIN_COMPLIANCE_ACK_REQUIRED', message: 'Quản trị viên cần xác nhận tuân thủ', prefix: 'Lỗi: ' },
    { locale: 'zh', status: 403, code: 'FIXTURE_POLICY', message: '管理员需要确认', prefix: 'Error: ' },
    { locale: 'en', status: 429, code: 429, message: 'Received HTTP message fixture', prefix: 'Error: ' },
    { locale: 'vi', status: 400, code: 'FIXTURE_BAD_REQUEST', message: '  Raw {message}: tiếng Việt / 中文  ', prefix: 'Lỗi: ' },
    { locale: 'vi', status: 500, code: 500, message: ' \t ', prefix: 'Lỗi: ' }
  ])('preserves a nonempty top-level HTTP message in $locale ($status)', async ({ locale, status, code, message, prefix }) => {
    getLocale.mockReturnValue(locale)
    const json = vi.fn().mockResolvedValue({ code, message, metadata: { opaque: 'unchanged-fixture' } })
    const getReader = vi.fn()
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status, json, body: { getReader } } as any)
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('error')
    expect(vm.errorMessage).toBe(message)
    expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
      { text: prefix + message, class: 'text-red-400' }
    ])
    expect(json).toHaveBeenCalledTimes(1)
    expect(getReader).not.toHaveBeenCalled()
  })

  describe.each([
    { locale: 'vi', httpError: 'Lỗi HTTP! Mã trạng thái: 502', noBody: 'Không có nội dung phản hồi', unknown: 'Lỗi không xác định', failed: 'Kiểm tra thất bại', prefix: 'Lỗi: ' },
    { locale: 'zh', httpError: 'HTTP error! status: 502', noBody: 'No response body', unknown: 'Unknown error', failed: 'Test failed', prefix: 'Error: ' },
    { locale: 'en', httpError: 'HTTP error! status: 502', noBody: 'No response body', unknown: 'Unknown error', failed: 'Test failed', prefix: 'Error: ' }
  ])('owned fallbacks in $locale', ({ locale, httpError, noBody, unknown, failed, prefix }) => {
    beforeEach(() => {
      getLocale.mockReturnValue(locale)
    })

    const invalidPayloads: { name: string; payload?: unknown; failure?: Error; noJson?: boolean }[] = [
      { name: 'missing message', payload: {} },
      { name: 'empty message', payload: { message: '' } },
      { name: 'numeric message', payload: { message: 17 } },
      { name: 'boolean message', payload: { message: false } },
      { name: 'object message', payload: { message: { text: 'Not an envelope message' } } },
      { name: 'array message', payload: { message: ['Not an envelope message'] } },
      { name: 'null message', payload: { message: null } },
      { name: 'null payload', payload: null },
      { name: 'array payload', payload: [{ message: 'Not a top-level message' }] },
      { name: 'primitive payload', payload: 'Not an envelope' },
      { name: 'numeric payload', payload: 502 },
      { name: 'nested message only', payload: { error: { code: 'FIXTURE_ERROR', message: 'Unverified nested message' } } },
      { name: 'JSON parse rejection', failure: new SyntaxError('Non-JSON fixture') },
      { name: 'missing json method', noJson: true },
      { name: 'plain Error named AbortError', failure: Object.assign(new Error('Plain abort fixture'), { name: 'AbortError' }) }
    ]

    it.each(invalidPayloads)('uses the HTTP-status fallback for $name', async ({ payload, failure, noJson }) => {
      const json = failure ? vi.fn().mockRejectedValue(failure) : vi.fn().mockResolvedValue(payload)
      const getReader = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        body: { getReader },
        ...(noJson ? {} : { json })
      } as any)
      const wrapper = await mountReadyModal()
      const vm = wrapper.vm as any

      await vm.startTest()
      await flushPromises()

      expect(vm.status).toBe('error')
      expect(vm.errorMessage).toBe(httpError)
      expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
        { text: prefix + httpError, class: 'text-red-400' }
      ])
      expect(wrapper.text()).not.toContain('[object Object]')
      expect(json).toHaveBeenCalledTimes(noJson ? 0 : 1)
      expect(getReader).not.toHaveBeenCalled()
    })

    it.each(['missing body', 'missing reader'])('localizes %s without parsing successful responses as JSON', async (name) => {
      const json = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json,
        body: name === 'missing body' ? undefined : { getReader: vi.fn().mockReturnValue(undefined) }
      } as any)
      const wrapper = await mountReadyModal()
      const vm = wrapper.vm as any

      await vm.startTest()
      await flushPromises()

      expect(vm.status).toBe('error')
      expect(vm.errorMessage).toBe(noBody)
      expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
        { text: prefix + noBody, class: 'text-red-400' }
      ])
      expect(json).not.toHaveBeenCalled()
    })

    it('localizes non-Error fetch rejections and their owned prefix', async () => {
      global.fetch = vi.fn().mockRejectedValue({ raw: 'Non-Error rejection fixture' })
      const wrapper = await mountReadyModal()
      const vm = wrapper.vm as any

      await vm.startTest()
      await flushPromises()

      expect(vm.status).toBe('error')
      expect(vm.errorMessage).toBe(unknown)
      expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
        { text: prefix + unknown, class: 'text-red-400' }
      ])
    })

    it.each([
      { type: 'test_complete', error: undefined },
      { type: 'test_complete', error: '' },
      { type: 'test_complete', error: null },
      { type: 'test_complete', error: false },
      { type: 'test_complete', error: 0 },
      { type: 'error', error: undefined },
      { type: 'error', error: '' },
      { type: 'error', error: null },
      { type: 'error', error: false },
      { type: 'error', error: 0 }
    ])('localizes streamed $type with absent/falsy error $error', async ({ type, error }) => {
      const response = streamResponse([{ type, success: false, error }])
      global.fetch = vi.fn().mockResolvedValue(response as any)
      const wrapper = await mountReadyModal()
      const vm = wrapper.vm as any

      await vm.startTest()
      await flushPromises()

      expect(vm.status).toBe('error')
      expect(vm.errorMessage).toBe(type === 'test_complete' ? failed : unknown)
      expect(response.json).not.toHaveBeenCalled()
      expect(response.body.getReader).toHaveBeenCalledTimes(1)
    })

    it.each(['test_complete', 'error'])('preserves supplied %s errors, status and incremental model content verbatim', async (type) => {
      const rawError = '  Raw {error}: tiếng Việt / 中文  '
      const rawStatus = '  /v1/chat/completions {status}: giữ nguyên  '
      const rawContent = 'Model output: tiếng Việt / 中文 {content}'
      const response = streamResponse([
        { type: 'status', text: rawStatus },
        { type: 'content', text: rawContent.slice(0, 17) },
        { type: 'content', text: rawContent.slice(17) },
        { type, success: false, error: rawError }
      ])
      global.fetch = vi.fn().mockResolvedValue(response as any)
      const wrapper = await mountReadyModal()
      const vm = wrapper.vm as any

      await vm.startTest()
      await flushPromises()

      expect(vm.status).toBe('error')
      expect(vm.errorMessage).toBe(rawError)
      expect(vm.streamingContent).toBe('')
      expect(vm.outputLines).toContainEqual({ text: rawStatus, class: 'text-cyan-300' })
      expect(vm.outputLines).toContainEqual({ text: rawContent, class: 'text-green-300' })
      expect(vm.outputLines.some((line: any) => line.class === 'text-red-400')).toBe(false)
      expect(response.json).not.toHaveBeenCalled()
    })
  })

  it.each(['fetch', 'json'])('keeps recognized DOMException AbortError from %s idle and silent', async (source) => {
    getLocale.mockReturnValue('vi')
    const aborted = new DOMException('Abort fixture', 'AbortError')
    const json = vi.fn().mockRejectedValue(aborted)
    const getReader = vi.fn()
    global.fetch = source === 'fetch'
      ? vi.fn().mockRejectedValue(aborted)
      : vi.fn().mockResolvedValue({ ok: false, status: 429, json, body: { getReader } } as any)
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('idle')
    expect(vm.errorMessage).toBe('')
    expect(vm.outputLines.some((line: any) => line.class === 'text-red-400')).toBe(false)
    expect(json).toHaveBeenCalledTimes(source === 'json' ? 1 : 0)
    expect(getReader).not.toHaveBeenCalled()
  })

  it('preserves raw Error messages while localizing only the catch prefix', async () => {
    getLocale.mockReturnValue('vi')
    const message = '  Raw network fixture {message}: 中文  '
    global.fetch = vi.fn().mockRejectedValue(new Error(message))
    const wrapper = await mountReadyModal()
    const vm = wrapper.vm as any

    await vm.startTest()
    await flushPromises()

    expect(vm.status).toBe('error')
    expect(vm.errorMessage).toBe(message)
    expect(vm.outputLines.filter((line: any) => line.class === 'text-red-400')).toStrictEqual([
      { text: 'Lỗi: ' + message, class: 'text-red-400' }
    ])
  })

  it('posts compact mode for OpenAI compact probe', async () => {
    const wrapper = mount(AccountTestModal, {
      props: {
        show: true,
        account: buildAccount()
      },
      global: {
        stubs: {
          BaseDialog: BaseDialogStub,
          Select: SelectStub,
          TextArea: TextAreaStub,
          Icon: true
        }
      }
    })

    await flushPromises()
    ;(wrapper.vm as any).selectedModelId = 'gpt-5.4'
    ;(wrapper.vm as any).testMode = 'compact'
    await (wrapper.vm as any).startTest()
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, options] = (global.fetch as any).mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({
      model_id: 'gpt-5.4',
      mode: 'compact'
    })
  })

  it('renders Chat Completions path status from test SSE', async () => {
    const encoder = new TextEncoder()
    const chunks = [
      encoder.encode('data: {"type":"status","text":"已通过 /v1/chat/completions 验证"}\n\n'),
      encoder.encode('data: {"type":"test_complete","success":true}\n\n')
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => Promise.resolve(
            chunks.length > 0
              ? { done: false, value: chunks.shift() }
              : { done: true, value: undefined }
          ))
        })
      }
    } as any)

    const wrapper = mount(AccountTestModal, {
      props: {
        show: true,
        account: buildAccount()
      },
      global: {
        stubs: {
          BaseDialog: BaseDialogStub,
          Select: SelectStub,
          TextArea: TextAreaStub,
          Icon: true
        }
      }
    })

    await flushPromises()
    ;(wrapper.vm as any).selectedModelId = 'gpt-5.4'
    await (wrapper.vm as any).startTest()
    await flushPromises()

    expect(wrapper.text()).toContain('已通过 /v1/chat/completions 验证')
  })
})
