import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosInstance } from 'axios'

// 需要在导入 client 之前设置 mock
vi.mock('@/i18n', () => ({
  getLocale: () => 'zh-CN',
}))

describe('API Client', () => {
  let apiClient: AxiosInstance

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
    // 每次测试重新导入以获取干净的模块状态
    vi.resetModules()
    const mod = await import('@/api/client')
    apiClient = mod.apiClient
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // --- 请求拦截器 ---

  describe('请求拦截器', () => {
    it('规范化相对 API base，避免在回调页拼出相对 v1 路径', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE_URL', 'api/v1')

      const mod = await import('@/api/client')

      expect(mod.apiClient.defaults.baseURL).toBe('/api/v1')
      expect(mod.buildApiUrl('/auth/oauth/github/callback?code=abc')).toBe(
        '/api/v1/auth/oauth/github/callback?code=abc'
      )
    })

    it('自动附加 Authorization 头', async () => {
      localStorage.setItem('auth_token', 'my-jwt-token')

      // 拦截实际请求
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/test')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('Authorization')).toBe('Bearer my-jwt-token')
    })

    it('无 token 时不附加 Authorization 头', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/test')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('Authorization')).toBeFalsy()
    })

    it('GET 请求自动附加 timezone 参数', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/test')

      const config = adapter.mock.calls[0][0]
      expect(config.params).toHaveProperty('timezone')
    })

    it('POST 请求不附加 timezone 参数', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.post('/test', { foo: 'bar' })

      const config = adapter.mock.calls[0][0]
      expect(config.params?.timezone).toBeUndefined()
    })

    it('请求默认带 withCredentials 以支持跨域 cookie', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.post('/auth/oauth/bind-token')

      const config = adapter.mock.calls[0][0]
      expect(config.withCredentials).toBe(true)
    })

    it('Admin API 在进入管理页面前也带 Admin UI 标记', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/admin/users')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('X-Admin-UI-Request')).toBe('1')
    })

    it('管理页面调用共享 API 时带 Admin UI 标记', async () => {
      window.history.replaceState({}, '', '/admin/dashboard')
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/groups/available')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('X-Admin-UI-Request')).toBe('1')
    })

    it('普通用户页面调用共享 API 时不带 Admin UI 标记', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/groups/available')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('X-Admin-UI-Request')).toBeFalsy()
    })

    it('用户侧 timing API 自动带 User UI 标记', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/auth/me')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('X-User-UI-Request')).toBe('1')
      expect(config.headers.get('X-Admin-UI-Request')).toBeFalsy()
    })

    it('支付用户 API 带 User UI 标记，公开支付 API 不带', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/payment/plans')
      expect(adapter.mock.calls[0][0].headers.get('X-User-UI-Request')).toBe('1')

      await apiClient.post('/payment/public/orders/verify', {})
      expect(adapter.mock.calls[1][0].headers.get('X-User-UI-Request')).toBeFalsy()
    })

    it('管理页调用共享 API 时同时带 Admin 与 User UI 标记', async () => {
      window.history.replaceState({}, '', '/admin/dashboard')
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: {} },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await apiClient.get('/keys')

      const config = adapter.mock.calls[0][0]
      expect(config.headers.get('X-Admin-UI-Request')).toBe('1')
      expect(config.headers.get('X-User-UI-Request')).toBe('1')
    })
  })

  // --- 响应拦截器 ---

  describe('响应拦截器', () => {
    it('code=0 时解包 data 字段', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 0, data: { name: 'test' }, message: 'ok' },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      const response = await apiClient.get('/test')
      expect(response.data).toEqual({ name: 'test' })
    })

    it('code!=0 时拒绝并返回结构化错误', async () => {
      const adapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { code: 1001, message: '参数错误', data: null },
        headers: {},
        config: {},
        statusText: 'OK',
      })
      apiClient.defaults.adapter = adapter

      await expect(apiClient.get('/test')).rejects.toEqual(
        expect.objectContaining({
          code: 1001,
          message: '参数错误',
        })
      )
    })

    describe.each(['/admin/ops/errors', '/dashboard'])('OPS_DISABLED at %s', (pathname) => {
      const cases: {
        name: string
        status: number
        body: { reason?: unknown; message?: string }
        disabled: boolean
      }[] = [
        {
          name: 'localized message with stable reason', status: 404,
          body: { reason: 'OPS_DISABLED', message: 'Giám sát vận hành đã bị tắt' }, disabled: true,
        },
        {
          name: 'missing message with stable reason', status: 404,
          body: { reason: 'OPS_DISABLED' }, disabled: true,
        },
        {
          name: 'legacy message without reason', status: 404,
          body: { message: 'Ops monitoring is disabled' }, disabled: true,
        },
        {
          name: 'different supplied reason', status: 404,
          body: { reason: 'OTHER_REASON', message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'empty supplied reason', status: 404,
          body: { reason: '', message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'null supplied reason', status: 404,
          body: { reason: null, message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'false supplied reason', status: 404,
          body: { reason: false, message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'zero supplied reason', status: 404,
          body: { reason: 0, message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'case-sensitive reason', status: 404,
          body: { reason: 'ops_disabled', message: 'Ops monitoring is disabled' }, disabled: false,
        },
        {
          name: 'unrelated message without reason', status: 404,
          body: { message: 'Another feature is unavailable' }, disabled: false,
        },
        {
          name: 'stable reason at another status', status: 403,
          body: { reason: 'OPS_DISABLED', message: 'Ops monitoring is disabled' }, disabled: false,
        },
      ]

      it.each(cases)('$name', async ({ status, body, disabled }) => {
        const originalLocation = window.location
        const listener = vi.fn()
        const url = '/admin/ops/dashboard'
        const data = {
          code: 'FIXTURE_UPSTREAM_CODE',
          error: 'fixture-error-detail',
          metadata: { source: 'ops-fixture' },
          ...body,
        }
        const authState = {
          auth_token: 'access-fixture',
          refresh_token: 'refresh-fixture',
          auth_user: JSON.stringify({ id: 7 }),
          token_expires_at: '123',
        }
        const refresh = vi.spyOn(await import('@/api/tokenRefresh'), 'refreshAuthTokens')
          .mockRejectedValue(new Error('Unexpected OPS token refresh'))

        Object.defineProperty(window, 'location', {
          value: { ...originalLocation, pathname, href: pathname },
          writable: true,
        })
        window.addEventListener('ops-monitoring-disabled', listener)

        try {
          for (const [key, value] of Object.entries(authState)) {
            localStorage.setItem(key, value)
          }
          localStorage.setItem('ops_monitoring_enabled_cached', 'true')
          sessionStorage.setItem('auth_expired', 'fixture-session-marker')
          apiClient.defaults.adapter = vi.fn().mockRejectedValue({
            response: { status, data },
            config: { url },
            message: 'HTTP fixture failure',
          })

          await expect(apiClient.get(url)).rejects.toStrictEqual(disabled ? {
            status,
            code: 'OPS_DISABLED',
            message: data.message || 'HTTP fixture failure',
            url,
          } : {
            status,
            code: data.code,
            reason: data.reason,
            error: data.error,
            message: data.message || 'HTTP fixture failure',
            metadata: data.metadata,
          })
          expect(localStorage.getItem('ops_monitoring_enabled_cached')).toBe(disabled ? 'false' : 'true')
          expect(listener).toHaveBeenCalledTimes(disabled ? 1 : 0)
          expect(window.location.href).toBe(
            disabled && pathname === '/admin/ops/errors' ? '/admin/settings' : pathname
          )
          for (const [key, value] of Object.entries(authState)) {
            expect(localStorage.getItem(key)).toBe(value)
          }
          expect(sessionStorage.getItem('auth_expired')).toBe('fixture-session-marker')
          expect(refresh).not.toHaveBeenCalled()
        } finally {
          window.removeEventListener('ops-monitoring-disabled', listener)
          Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
        }
      })
    })

    it.each([
      {
        name: 'legacy English', status: 423, code: 'ADMIN_COMPLIANCE_ACK_REQUIRED',
        message: 'administrator compliance acknowledgement is required', compliance: true,
      },
      {
        name: 'Vietnamese', status: 423, code: 'ADMIN_COMPLIANCE_ACK_REQUIRED',
        message: 'Quản trị viên cần xác nhận tuân thủ', compliance: true,
      },
      {
        name: 'other code despite legacy wording', status: 423, code: 'OTHER_POLICY',
        message: 'administrator compliance acknowledgement is required', compliance: false,
      },
      {
        name: 'other status despite compliance code', status: 403, code: 'ADMIN_COMPLIANCE_ACK_REQUIRED',
        message: 'Quản trị viên cần xác nhận tuân thủ', compliance: false,
      },
    ])('admin compliance: $name', async ({ status, code, message, compliance }) => {
      const originalLocation = window.location
      const listener = vi.fn()
      const metadata = {
        version: 'v2026.06.10',
        document_path_zh: 'docs/legal/admin-compliance.zh.md',
        document_path_en: 'docs/legal/admin-compliance.en.md',
        document_url_zh: 'https://example.invalid/legal/admin-compliance.zh.md',
        document_url_en: 'https://example.invalid/legal/admin-compliance.en.md',
      }
      const authState = {
        auth_token: 'admin-token',
        refresh_token: 'fixture-refresh-token',
        auth_user: JSON.stringify({ id: 1, role: 'admin' }),
        token_expires_at: 'fixture-expiry',
      }
      const refresh = vi.spyOn(await import('@/api/tokenRefresh'), 'refreshAuthTokens')
        .mockRejectedValue(new Error('Unexpected compliance token refresh'))

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, pathname: '/admin/users', href: '/admin/users' },
        writable: true,
      })
      window.addEventListener('admin-compliance-required', listener)

      try {
        for (const [key, value] of Object.entries(authState)) {
          localStorage.setItem(key, value)
        }
        sessionStorage.setItem('auth_expired', 'fixture-session-marker')
        apiClient.defaults.adapter = vi.fn().mockRejectedValue({
          response: {
            status,
            data: { code, message, metadata: { ...metadata } },
          },
          config: {
            url: '/admin/users',
            headers: { Authorization: 'Bearer admin-token' },
          },
          code: 'ERR_BAD_REQUEST',
        })

        const request = apiClient.get('/admin/users')
        if (compliance) {
          await expect(request).rejects.toStrictEqual({ status, code, message, metadata })
          expect(listener).toHaveBeenCalledTimes(1)
          expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(metadata)
        } else {
          await expect(request).rejects.toMatchObject({ status, code, message, metadata })
          expect(listener).not.toHaveBeenCalled()
        }

        expect(localStorage.getItem('auth_token')).toBe('admin-token')
        for (const [key, value] of Object.entries(authState)) {
          expect(localStorage.getItem(key)).toBe(value)
        }
        expect(sessionStorage.getItem('auth_expired')).toBe('fixture-session-marker')
        expect(refresh).not.toHaveBeenCalled()
        expect(window.location.href).toBe('/admin/users')
      } finally {
        window.removeEventListener('admin-compliance-required', listener)
        Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
      }
    })
  })

  // --- 401 Token 刷新 ---

  describe('401 Token 刷新', () => {
    it('无 refresh_token 时 401 清除 localStorage', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      // 不设置 refresh_token

      // Mock window.location
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, pathname: '/dashboard', href: '/dashboard' },
        writable: true,
      })

      const adapter = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
        },
        config: {
          url: '/test',
          headers: { Authorization: 'Bearer expired-token' },
        },
        code: 'ERR_BAD_REQUEST',
      })
      apiClient.defaults.adapter = adapter

      await expect(apiClient.get('/test')).rejects.toBeDefined()

      expect(localStorage.getItem('auth_token')).toBeNull()

      // 恢复 location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      })
    })

    it('有 refresh_token 时刷新并重试原请求', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'refresh-token')
      localStorage.setItem('token_expires_at', String(Date.now() - 1))
      localStorage.setItem('auth_user', JSON.stringify({ id: 7 }))

      const adapter = vi.fn()
        .mockRejectedValueOnce({
          response: {
            status: 401,
            data: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
          },
          config: {
            url: '/test',
            headers: { Authorization: 'Bearer expired-token' },
          },
          code: 'ERR_BAD_REQUEST',
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { code: 0, data: { ok: true } },
          headers: {},
          config: {},
          statusText: 'OK',
        })
      apiClient.defaults.adapter = adapter
      vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'ok',
          data: {
            access_token: 'new-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        },
      })

      await expect(apiClient.get('/test')).resolves.toMatchObject({ data: { ok: true } })

      expect(adapter).toHaveBeenCalledTimes(2)
      expect(localStorage.getItem('auth_token')).toBe('new-token')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token')
      expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer new-token')
    })

    it.each([429, 500, 503, 0])('刷新暂时失败（%s）时保留会话并返回实际状态', async (status) => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'refresh-token')
      localStorage.setItem('auth_user', JSON.stringify({ id: 7 }))
      localStorage.setItem('token_expires_at', '123')
      const refreshError = new axios.AxiosError('Refresh unavailable', 'ERR_NETWORK')
      if (status) {
        refreshError.response = {
          status, data: { message: 'Please try again later' }, statusText: '',
          headers: {}, config: { headers: new axios.AxiosHeaders() },
        }
      }
      const refresh = await import('@/api/tokenRefresh')
      vi.spyOn(refresh, 'refreshAuthTokens').mockRejectedValueOnce(refreshError)
      const adapter = vi.fn().mockRejectedValueOnce({
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        config: { url: '/test', headers: { Authorization: 'Bearer expired-token' } },
      })
      apiClient.defaults.adapter = adapter

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status, code: 'TOKEN_REFRESH_UNAVAILABLE',
        message: status ? 'Please try again later' : 'Refresh unavailable',
      })
      expect(adapter).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('auth_token')).toBe('expired-token')
      expect(localStorage.getItem('refresh_token')).toBe('refresh-token')
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify({ id: 7 }))
      expect(localStorage.getItem('token_expires_at')).toBe('123')
      expect(sessionStorage.getItem('auth_expired')).toBeNull()
      expect(window.location.pathname).toBe('/')
    })

    it.each([401, 403, null])('刷新被拒绝（%s）时仍清除失效会话', async (status) => {
      window.history.replaceState({}, '', '/login')
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'refresh-token')
      localStorage.setItem('auth_user', JSON.stringify({ id: 7 }))
      localStorage.setItem('token_expires_at', '123')
      const refreshError = status
        ? Object.assign(new axios.AxiosError('Refresh rejected'), { response: { status } })
        : new Error('Invalid refresh response')
      const refresh = await import('@/api/tokenRefresh')
      vi.spyOn(refresh, 'refreshAuthTokens').mockRejectedValueOnce(refreshError)
      apiClient.defaults.adapter = vi.fn().mockRejectedValueOnce({
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        config: { url: '/test', headers: { Authorization: 'Bearer expired-token' } },
      })

      await expect(apiClient.get('/test')).rejects.toMatchObject({ status: 401, code: 'TOKEN_REFRESH_FAILED' })
      for (const key of ['auth_token', 'refresh_token', 'auth_user', 'token_expires_at']) {
        expect(localStorage.getItem(key)).toBeNull()
      }
      expect(sessionStorage.getItem('auth_expired')).toBe('1')
    })

    it('刷新期间换号时旧请求不会清除新会话', async () => {
      localStorage.setItem('auth_token', 'user-a-access')
      localStorage.setItem('refresh_token', 'user-a-refresh')
      localStorage.setItem('token_expires_at', String(Date.now() - 1))
      localStorage.setItem('auth_user', JSON.stringify({ id: 7 }))

      apiClient.defaults.adapter = vi.fn().mockRejectedValueOnce({
        response: {
          status: 401,
          data: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
        },
        config: {
          url: '/test',
          headers: { Authorization: 'Bearer user-a-access' },
        },
        code: 'ERR_BAD_REQUEST',
      })

      let rejectRefresh!: (reason: Error) => void
      vi.spyOn(axios, 'post').mockImplementationOnce(
        () => new Promise((_resolve, reject) => {
          rejectRefresh = reject
        })
      )

      const staleRequest = apiClient.get('/test')
      await vi.waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1))

      localStorage.setItem('auth_token', 'user-b-access')
      localStorage.setItem('refresh_token', 'user-b-refresh')
      localStorage.setItem('token_expires_at', String(Date.now() + 3600_000))
      localStorage.setItem('auth_user', JSON.stringify({ id: 8 }))
      rejectRefresh(new Error('stale refresh failed'))

      await expect(staleRequest).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' })
      expect(localStorage.getItem('auth_token')).toBe('user-b-access')
      expect(localStorage.getItem('refresh_token')).toBe('user-b-refresh')
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify({ id: 8 }))
      expect(window.location.pathname).toBe('/')
    })
  })

  // --- 网络错误 ---

  describe('网络错误', () => {
    it.each(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', undefined])('网络错误保留错误码 %s', async (code) => {
      const adapter = vi.fn().mockRejectedValue({
        code,
        message: 'Network Error',
        config: { url: '/test' },
        // 没有 response
      })
      apiClient.defaults.adapter = adapter

      await expect(apiClient.get('/test')).rejects.toEqual(
        expect.objectContaining({
          status: 0,
          code: code || 'ERR_NETWORK',
          message: 'Network error. Please check your connection.',
        })
      )
    })
  })

  // --- 请求取消 ---

  describe('请求取消', () => {
    it('取消的请求保持原始取消错误', async () => {
      const source = axios.CancelToken.source()

      const adapter = vi.fn().mockRejectedValue(
        new axios.Cancel('Operation canceled')
      )
      apiClient.defaults.adapter = adapter

      await expect(
        apiClient.get('/test', { cancelToken: source.token })
      ).rejects.toBeDefined()
    })
  })
})
