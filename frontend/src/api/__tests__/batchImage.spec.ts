import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelBatchImageJob,
  deleteBatchImageJobRecord,
  downloadBatchImageZip,
  getBatchImageItemContent,
  getBatchImageJob,
  listBatchImageItems,
  listBatchImageJobs,
  listBatchImageModels,
  submitBatchImageJob,
} from '@/api/batchImage'
import type { BatchImageSubmitRequest } from '@/api/batchImage'

const mocks = vi.hoisted(() => ({
  locale: vi.fn(() => 'vi'),
  fetch: vi.fn(),
}))

vi.mock('@/i18n', () => ({ getLocale: mocks.locale }))
vi.mock('@/api/client', () => ({
  buildGatewayUrl: (path: string) => `/gateway${path}`,
}))

const apiKey = 'api-key-fixture'
const batchId = 'batch/with space'
const customId = 'item/with space'
const expectedHeaders = {
  Authorization: 'Bearer api-key-fixture',
  'Accept-Language': 'vi',
}
const payload: BatchImageSubmitRequest = {
  model: 'image-fixture',
  task_name: 'unchanged task',
  items: [{
    custom_id: 'item-fixture',
    prompt: 'Keep this request text unchanged',
    reference_images: [{
      mime_type: 'image/png',
      file_uri: 'https://assets.example.invalid/reference.png',
    }],
  }],
  metadata: { fixture: 'unchanged' },
}
const authState = {
  auth_token: 'session-access-fixture',
  refresh_token: 'session-refresh-fixture',
  auth_user: JSON.stringify({ id: 7 }),
  token_expires_at: '123',
}

describe('batch image requests', () => {
  beforeEach(() => {
    mocks.locale.mockReset().mockReturnValue('vi')
    mocks.fetch.mockReset()
    vi.stubGlobal('fetch', mocks.fetch)
    localStorage.clear()
    sessionStorage.clear()
    for (const [key, value] of Object.entries(authState)) {
      localStorage.setItem(key, value)
    }
    sessionStorage.setItem('auth_expired', 'session-marker-fixture')
  })

  afterEach(() => {
    try {
      for (const [key, value] of Object.entries(authState)) {
        expect(localStorage.getItem(key)).toBe(value)
      }
      expect(localStorage.length).toBe(Object.keys(authState).length)
      expect(sessionStorage.getItem('auth_expired')).toBe('session-marker-fixture')
      expect(sessionStorage.length).toBe(1)
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    }
  })

  const requests: {
    name: string
    request: () => Promise<unknown>
    url: string
    options: RequestInit
    result: 'json' | 'blob' | 'void'
  }[] = [
    {
      name: 'submit preserves JSON, API key and idempotency key',
      request: () => submitBatchImageJob(apiKey, payload, 'idempotency-fixture'),
      url: '/gateway/v1/images/batches',
      options: {
        method: 'POST',
        headers: {
          ...expectedHeaders,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idempotency-fixture',
        },
        body: JSON.stringify(payload),
      },
      result: 'json',
    },
    {
      name: 'get encodes the batch ID',
      request: () => getBatchImageJob(apiKey, batchId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list keeps the default limit',
      request: () => listBatchImageJobs(apiKey),
      url: '/gateway/v1/images/batches?limit=20',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list keeps a numeric limit',
      request: () => listBatchImageJobs(apiKey, 7),
      url: '/gateway/v1/images/batches?limit=7',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list preserves all structured query options',
      request: () => listBatchImageJobs(apiKey, {
        limit: 9,
        cursor: 'cursor/with space',
        status: 'processing results',
        taskName: 'task/with space',
        downloaded: 'false',
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-02T00:00:00Z',
      }),
      url: '/gateway/v1/images/batches?limit=9&cursor=cursor%2Fwith+space&status=processing+results&task_name=task%2Fwith+space&downloaded=false&from=2026-10-01T00%3A00%3A00Z&to=2026-10-02T00%3A00%3A00Z',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list models preserves the model endpoint',
      request: () => listBatchImageModels(apiKey),
      url: '/gateway/v1/images/batches/models',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list items omits an empty status',
      request: () => listBatchImageItems(apiKey, batchId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/items',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'list items encodes the status',
      request: () => listBatchImageItems(apiKey, batchId, 'processing results'),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/items?status=processing%20results',
      options: { headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'cancel keeps POST without a body',
      request: () => cancelBatchImageJob(apiKey, batchId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/cancel',
      options: { method: 'POST', headers: expectedHeaders },
      result: 'json',
    },
    {
      name: 'download returns the unmodified ZIP blob',
      request: () => downloadBatchImageZip(apiKey, batchId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/download',
      options: { headers: expectedHeaders },
      result: 'blob',
    },
    {
      name: 'item content preserves the default image index',
      request: () => getBatchImageItemContent(apiKey, batchId, customId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/items/item%2Fwith%20space/content?image_index=0',
      options: { headers: expectedHeaders },
      result: 'blob',
    },
    {
      name: 'item content encodes IDs and preserves the supplied image index',
      request: () => getBatchImageItemContent(apiKey, batchId, customId, 2),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space/items/item%2Fwith%20space/content?image_index=2',
      options: { headers: expectedHeaders },
      result: 'blob',
    },
    {
      name: 'delete keeps DELETE without a body or response parsing',
      request: () => deleteBatchImageJobRecord(apiKey, batchId),
      url: '/gateway/v1/images/batches/batch%2Fwith%20space',
      options: { method: 'DELETE', headers: expectedHeaders },
      result: 'void',
    },
  ]

  it.each(requests)('$name', async ({ request, url, options, result }) => {
    const jsonResult = { id: 'batch-response-fixture', data: [] }
    const blobResult = new Blob(['binary-fixture'], { type: 'application/octet-stream' })
    const json = vi.fn().mockResolvedValue(jsonResult)
    const blob = vi.fn().mockResolvedValue(blobResult)
    const createElement = vi.spyOn(document, 'createElement')
    mocks.fetch.mockResolvedValue({ ok: true, json, blob })

    const response = await request()

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.fetch.mock.calls[0]).toStrictEqual([url, options])
    expect(mocks.locale).toHaveBeenCalledTimes(1)
    expect(response).toBe(result === 'json' ? jsonResult : result === 'blob' ? blobResult : undefined)
    expect(json).toHaveBeenCalledTimes(result === 'json' ? 1 : 0)
    expect(blob).toHaveBeenCalledTimes(result === 'blob' ? 1 : 0)
    expect(createElement).not.toHaveBeenCalled()
  })

  it('reads the selected locale on each request in the same module instance', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ id: 'batch-fixture' }) })

    for (const [index, locale] of ['vi', 'zh', 'en'].entries()) {
      mocks.locale.mockReturnValue(locale)
      await getBatchImageJob(apiKey, batchId)
      expect(mocks.fetch.mock.calls[index]).toStrictEqual([
        '/gateway/v1/images/batches/batch%2Fwith%20space',
        { headers: { Authorization: 'Bearer api-key-fixture', 'Accept-Language': locale } },
      ])
    }

    expect(mocks.fetch).toHaveBeenCalledTimes(3)
    expect(mocks.locale).toHaveBeenCalledTimes(3)
  })

  it.each([
    {
      name: 'nested error takes precedence over the top-level message',
      status: 429,
      statusText: 'Too Many Requests',
      body: { error: { code: 'FIXTURE_RATE_LIMIT', message: 'Raw nested upstream message' }, message: 'Different top-level message' },
      requestId: 'request-fixture',
      message: 'Raw nested upstream message',
      code: 'FIXTURE_RATE_LIMIT',
      invalidJson: false,
    },
    {
      name: 'top-level message retains the HTTP status fallback code',
      status: 403,
      statusText: 'Forbidden',
      body: { message: 'Unchanged top-level message' },
      requestId: 'top-request-fixture',
      message: 'Unchanged top-level message',
      code: 403,
      invalidJson: false,
    },
    {
      name: 'missing messages retain statusText and an absent request ID',
      status: 502,
      statusText: 'Bad Gateway',
      body: {},
      requestId: '',
      message: 'Bad Gateway',
      code: 502,
      invalidJson: false,
    },
    {
      name: 'non-JSON errors retain statusText and request ID',
      status: 503,
      statusText: 'Service Unavailable',
      body: undefined,
      requestId: 'non-json-request-fixture',
      message: 'Service Unavailable',
      code: 503,
      invalidJson: true,
    },
    {
      name: 'non-JSON errors without statusText retain the HTTP fallback',
      status: 504,
      statusText: '',
      body: undefined,
      requestId: '',
      message: 'HTTP 504',
      code: 504,
      invalidJson: true,
    },
  ])('$name', async ({ status, statusText, body, requestId, message, code, invalidJson }) => {
    const json = invalidJson
      ? vi.fn().mockRejectedValue(new SyntaxError('Non-JSON fixture'))
      : vi.fn().mockResolvedValue(body)
    mocks.fetch.mockResolvedValue({
      ok: false,
      status,
      statusText,
      headers: new Headers(requestId ? { 'X-Request-Id': requestId } : {}),
      json,
    })

    const request = getBatchImageJob(apiKey, batchId)

    await expect(request).rejects.toBeInstanceOf(Error)
    await expect(request).rejects.toMatchObject({ message, code, status, requestId })
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(json).toHaveBeenCalledTimes(1)
  })

  it('propagates a fetch rejection unchanged without retrying', async () => {
    const failure = new TypeError('Local fetch failure fixture')
    mocks.fetch.mockRejectedValue(failure)

    await expect(listBatchImageModels(apiKey)).rejects.toBe(failure)

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
