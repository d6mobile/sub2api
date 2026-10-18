import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'
import viCatalog from '@/i18n/locales/vi'
import EmailTemplateEditor from '../EmailTemplateEditor.vue'

const {
  getEmailTemplates,
  getEmailTemplate,
  previewEmailTemplate,
  showError,
  showSuccess
} = vi.hoisted(() => ({
  getEmailTemplates: vi.fn(),
  getEmailTemplate: vi.fn(),
  previewEmailTemplate: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn()
}))

vi.mock('@/api', () => ({
  adminAPI: {
    settings: { getEmailTemplates, getEmailTemplate, previewEmailTemplate }
  }
}))

vi.mock('@/stores', () => ({
  useAppStore: () => ({ showError, showSuccess })
}))

// The Vitest alias is runtime-only; use the real compiler-enabled build for raw catalogs.
vi.mock('vue-i18n', () => vi.importActual<typeof import('vue-i18n')>(
  new URL('../../../../../node_modules/vue-i18n/dist/vue-i18n.esm-bundler.js', import.meta.url).pathname
))

const prefix = 'admin.settings.emailTemplates'

// These literals are copied from the original component, not from the catalogs.
const originalEvents = [
  {
    value: 'auth.verify_code',
    id: 'authVerifyCode',
    category: 'auth',
    en: {
      label: 'Email Verification Code',
      timing: 'Sent for registration, email binding, OAuth pending email completion, or TOTP email verification.'
    },
    zh: {
      label: '邮箱验证码',
      timing: '注册、绑定邮箱、OAuth 补全邮箱或 TOTP 邮箱校验时发送。'
    }
  },
  {
    value: 'auth.password_reset',
    id: 'authPasswordReset',
    category: 'auth',
    en: {
      label: 'Password Reset',
      timing: 'Sent when a user requests a password reset link.'
    },
    zh: {
      label: '密码重置',
      timing: '用户请求密码重置链接时发送。'
    }
  },
  {
    value: 'notification_email.verify_code',
    id: 'notificationEmailVerifyCode',
    category: 'auth',
    en: {
      label: 'Notification Email Verification',
      timing: 'Sent when a user adds and verifies an extra notification email address.'
    },
    zh: {
      label: '通知邮箱验证码',
      timing: '用户添加并验证额外通知邮箱时发送。'
    }
  },
  {
    value: 'subscription.purchase_success',
    id: 'subscriptionPurchaseSuccess',
    category: 'subscription',
    en: {
      label: 'Subscription Activated',
      timing: 'Sent after a subscription order is paid and the subscription is activated or extended.'
    },
    zh: {
      label: '订阅开通成功',
      timing: '订阅订单完成支付并成功开通或续期后发送。'
    }
  },
  {
    value: 'subscription.expiry_reminder',
    id: 'subscriptionExpiryReminder',
    category: 'subscription',
    en: {
      label: 'Subscription Expiry Reminder',
      timing: 'Sent by the background job when an active subscription has 7, 3, or 1 day remaining. It can be disabled in Email settings.'
    },
    zh: {
      label: '订阅到期提醒',
      timing: '后台任务在订阅仍有效且距离到期剩余 7 天、3 天、1 天时各发送一次，可通过邮件设置中的开关关闭。'
    }
  },
  {
    value: 'balance.low',
    id: 'balanceLow',
    category: 'billing',
    en: {
      label: 'Low Balance Alert',
      timing: "Sent when a user's balance drops below the global or personal reminder threshold."
    },
    zh: {
      label: '余额不足提醒',
      timing: '用户余额低于全局或个人配置的提醒阈值时发送。'
    }
  },
  {
    value: 'balance.recharge_success',
    id: 'balanceRechargeSuccess',
    category: 'billing',
    en: {
      label: 'Balance Recharge Success',
      timing: 'Sent after a balance recharge order is paid and credited.'
    },
    zh: {
      label: '余额充值成功',
      timing: '余额充值订单支付完成并入账后发送。'
    }
  },
  {
    value: 'account.quota_alert',
    id: 'accountQuotaAlert',
    category: 'admin',
    en: {
      label: 'Account Quota Alert',
      timing: 'Sent to admin notification emails when an upstream account reaches the configured quota alert threshold.'
    },
    zh: {
      label: '账号限额告警',
      timing: '上游账号的用量达到配置的额度告警阈值时发送给管理员通知邮箱。'
    }
  },
  {
    value: 'content_moderation.violation_notice',
    id: 'contentModerationViolationNotice',
    category: 'riskControl',
    en: {
      label: 'Risk Control Violation Notice',
      timing: 'Sent when a user request triggers content moderation or risk-control rules but the account is not disabled yet.'
    },
    zh: {
      label: '内容审计违规提醒',
      timing: '用户请求命中内容审计或风控规则、但尚未被禁用时发送。'
    }
  },
  {
    value: 'content_moderation.account_disabled',
    id: 'contentModerationAccountDisabled',
    category: 'riskControl',
    en: {
      label: 'Risk Control Account Disabled',
      timing: 'Sent when content moderation reaches the ban threshold and automatically disables the user account.'
    },
    zh: {
      label: '内容审计禁用账号',
      timing: '内容审计违规次数达到封禁阈值并自动禁用用户账号时发送。'
    }
  },
  {
    value: 'ops.alert',
    id: 'opsAlert',
    category: 'ops',
    en: {
      label: 'Ops Alert',
      timing: 'Sent to ops recipients when an ops monitoring rule fires and email notification settings allow it.'
    },
    zh: {
      label: '运维告警',
      timing: '运维监控规则触发告警并满足邮件通知配置时发送给运维收件人。'
    }
  },
  {
    value: 'ops.scheduled_report',
    id: 'opsScheduledReport',
    category: 'ops',
    en: {
      label: 'Ops Scheduled Report',
      timing: 'Sent when a configured daily, weekly, error digest, or account health report reaches its scheduled send time. Every daily and weekly summary metric is editable in this template.'
    },
    zh: {
      label: '运维定时报表',
      timing: '运维日报、周报、错误摘要或账号健康报表到达配置的发送时间时发送；日报和周报的完整指标均可在模板中编辑。'
    }
  }
] as const

const originalLabels = [
  { key: 'categories.auth', en: 'Auth', zh: '认证安全' },
  { key: 'categories.subscription', en: 'Subscription', zh: '订阅' },
  { key: 'categories.billing', en: 'Billing', zh: '计费' },
  { key: 'categories.admin', en: 'Admin', zh: '管理告警' },
  { key: 'categories.riskControl', en: 'Risk Control', zh: '风控' },
  { key: 'categories.ops', en: 'Ops', zh: '运维' },
  { key: 'categoryNotification', en: 'Notification', zh: '通知' },
  { key: 'optionalBadge', en: 'Optional', zh: '可退订通知' },
  { key: 'transactionalBadge', en: 'Transactional', zh: '事务邮件' }
] as const

function createTestI18n(locale: 'en' | 'zh' | 'vi') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: false,
    missingWarn: false,
    fallbackWarn: false,
    messages: { en, zh, vi: viCatalog }
  })
}

for (const locale of ['en', 'zh'] as const) {
  describe(`email template ${locale} metadata compatibility`, () => {
    const i18n = createTestI18n(locale)

    it.each(originalEvents)('preserves the original $id label and timing byte-for-byte', (event) => {
      expect(i18n.global.t(`${prefix}.events.${event.id}.label`)).toBe(event[locale].label)
      expect(i18n.global.t(`${prefix}.events.${event.id}.timing`)).toBe(event[locale].timing)
    })

    it.each(originalLabels)('preserves the original $key byte-for-byte', (label) => {
      expect(i18n.global.t(`${prefix}.${label.key}`)).toBe(label[locale])
    })
  })
}

describe('email template Vietnamese metadata catalog', () => {
  const i18n = createTestI18n('vi')
  const keys = [
    ...originalEvents.flatMap(({ id }) => [`events.${id}.label`, `events.${id}.timing`]),
    ...originalLabels.map(({ key }) => key)
  ]

  it.each(keys)('provides a non-empty Vietnamese translation for %s', (suffix) => {
    const key = `${prefix}.${suffix}`
    expect(i18n.global.te(key, 'vi')).toBe(true)
    const translated = i18n.global.t(key)
    expect(translated.trim()).not.toBe('')
    expect(translated).not.toBe(key)
    expect(translated).not.toBe(i18n.global.t(key, {}, { locale: 'en' }))
    expect(translated).not.toMatch(/[一-鿿]/)
  })
})

function mountEditor(i18n: ReturnType<typeof createTestI18n>) {
  return mount(EmailTemplateEditor, { global: { plugins: [i18n] } })
}

describe('EmailTemplateEditor rendered metadata', () => {
  let wrapper: ReturnType<typeof mountEditor> | undefined

  beforeEach(() => {
    vi.resetAllMocks()
    getEmailTemplates.mockResolvedValue({
      events: [{ value: 'balance.low', label: 'Server label', category: 'auth', optional: true }],
      locales: ['zh', 'en']
    })
    getEmailTemplate.mockResolvedValue({
      subject: 'Official subject',
      html: '<p>Official email content</p>',
      is_custom: false,
      placeholders: ['site_name']
    })
    previewEmailTemplate.mockResolvedValue({ subject: 'Official subject', html: '<p>Preview</p>' })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.clearAllMocks()
  })

  it('renders Vietnamese selected metadata and optional badge without changing email content or locales', async () => {
    const i18n = createTestI18n('vi')
    wrapper = mountEditor(i18n)
    await flushPromises()

    const meta = wrapper.get('.rounded-lg.border-primary-100')
    expect(meta.text()).toContain('Cảnh báo số dư thấp')
    expect(meta.text()).toContain(i18n.global.t(`${prefix}.events.balanceLow.timing`))
    expect(meta.text()).toContain(i18n.global.t(`${prefix}.categories.billing`))
    expect(meta.text()).toContain('Có thể hủy đăng ký')
    expect(wrapper.get('#email-template-event option').text()).toBe('Cảnh báo số dư thấp')
    expect(wrapper.text()).not.toMatch(/[一-鿿]/)
    expect(wrapper.text()).not.toContain('Low Balance Alert')
    expect(meta.text()).not.toContain('Server label')
    expect(meta.text()).not.toContain('Optional')
    expect(wrapper.findAll('#email-template-locale option').map((option) => option.attributes('value')))
      .toEqual(['zh', 'en'])
    expect(getEmailTemplate).toHaveBeenCalledWith('balance.low', 'zh')
    expect((wrapper.get('#email-template-subject').element as HTMLInputElement).value).toBe('Official subject')
    expect((wrapper.get('#email-template-html').element as HTMLTextAreaElement).value).toBe('<p>Official email content</p>')
    expect(previewEmailTemplate).toHaveBeenCalledWith({
      event: 'balance.low',
      locale: 'zh',
      subject: 'Official subject',
      html: '<p>Official email content</p>'
    })
    expect(showError).not.toHaveBeenCalled()
  })

  it('uses catalog metadata for every known event and reacts to UI locale changes', async () => {
    getEmailTemplates.mockResolvedValue({
      events: originalEvents.map(({ value }) => ({ value, label: 'Server label', category: 'unknown' })),
      locales: ['zh', 'en']
    })
    const i18n = createTestI18n('vi')
    wrapper = mountEditor(i18n)
    await flushPromises()

    for (const event of originalEvents) {
      await wrapper.get('#email-template-event').setValue(event.value)
      await flushPromises()
      const meta = wrapper.get('.rounded-lg.border-primary-100')
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.events.${event.id}.label`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.events.${event.id}.timing`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.categories.${event.category}`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.transactionalBadge`))
      expect(meta.text()).not.toMatch(/[一-鿿]/)
    }

    const loads = getEmailTemplate.mock.calls.length
    for (const locale of ['en', 'zh', 'vi'] as const) {
      i18n.global.locale.value = locale
      await nextTick()
      const meta = wrapper.get('.rounded-lg.border-primary-100')
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.events.opsScheduledReport.label`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.events.opsScheduledReport.timing`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.categories.ops`))
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.transactionalBadge`))
    }
    expect(getEmailTemplate).toHaveBeenCalledTimes(loads)
    expect(showError).not.toHaveBeenCalled()
  })

  it('preserves API label, description and raw-value fallbacks for unknown events', async () => {
    const categories = [
      [' AUTH ', 'categories.auth'],
      ['subscription', 'categories.subscription'],
      ['billing', 'categories.billing'],
      ['admin', 'categories.admin'],
      ['risk_control', 'categories.riskControl'],
      ['ops', 'categories.ops'],
      ['', 'categoryNotification']
    ] as const
    getEmailTemplates.mockResolvedValue({
      events: [
        ...categories.map(([category], index) => ({
          value: `custom.${index}`,
          label: `Custom event ${index}`,
          description: 'Custom timing from API',
          category
        })),
        { value: 'custom.unknown', category: ' Raw Category ' },
        'custom.string'
      ],
      locales: ['en']
    })
    const i18n = createTestI18n('vi')
    wrapper = mountEditor(i18n)
    await flushPromises()

    for (const [index, [, suffix]] of categories.entries()) {
      await wrapper.get('#email-template-event').setValue(`custom.${index}`)
      await flushPromises()
      const meta = wrapper.get('.rounded-lg.border-primary-100')
      expect(meta.text()).toContain(`Custom event ${index}`)
      expect(meta.text()).toContain('Custom timing from API')
      expect(meta.text()).toContain(i18n.global.t(`${prefix}.${suffix}`))
    }
    await wrapper.get('#email-template-event').setValue('custom.unknown')
    await flushPromises()
    expect(wrapper.get('.rounded-lg.border-primary-100').text()).toContain('custom.unknown')
    expect(wrapper.get('.rounded-lg.border-primary-100 span').element.textContent).toContain(' Raw Category ')
    await wrapper.get('#email-template-event').setValue('custom.string')
    await flushPromises()
    expect(wrapper.get('.rounded-lg.border-primary-100').text()).toContain('custom.string')
    expect(wrapper.get('.rounded-lg.border-primary-100').text()).toContain(i18n.global.t(`${prefix}.categoryNotification`))
    expect(showError).not.toHaveBeenCalled()
  })
})
