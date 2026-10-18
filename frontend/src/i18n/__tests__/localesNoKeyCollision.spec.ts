import { describe, expect, it } from 'vitest'

import enAdminAccounts from '../locales/en/admin/accounts'
import enAdminAudit from '../locales/en/admin/audit'
import enAdminChannels from '../locales/en/admin/channels'
import enAdminOps from '../locales/en/admin/ops'
import enAdminOverview from '../locales/en/admin/overview'
import enAdminPlugins from '../locales/en/admin/plugins'
import enAdminPromptAudit from '../locales/en/admin/promptAudit'
import enAdminResources from '../locales/en/admin/resources'
import enAdminSettings from '../locales/en/admin/settings'
import enBatchImage from '../locales/en/batchImage'
import enChannelMonitorV2 from '../locales/en/channelMonitorV2'
import enCommon from '../locales/en/common'
import enDashboard from '../locales/en/dashboard'
import enLanding from '../locales/en/landing'
import enMisc from '../locales/en/misc'
import zhAdminAccounts from '../locales/zh/admin/accounts'
import zhAdminAudit from '../locales/zh/admin/audit'
import zhAdminChannels from '../locales/zh/admin/channels'
import zhAdminOps from '../locales/zh/admin/ops'
import zhAdminOverview from '../locales/zh/admin/overview'
import zhAdminPlugins from '../locales/zh/admin/plugins'
import zhAdminPromptAudit from '../locales/zh/admin/promptAudit'
import zhAdminResources from '../locales/zh/admin/resources'
import zhAdminSettings from '../locales/zh/admin/settings'
import zhBatchImage from '../locales/zh/batchImage'
import zhChannelMonitorV2 from '../locales/zh/channelMonitorV2'
import zhCommon from '../locales/zh/common'
import zhDashboard from '../locales/zh/dashboard'
import zhLanding from '../locales/zh/landing'
import zhMisc from '../locales/zh/misc'
import viAdminAccounts from '../locales/vi/admin/accounts'
import viAdminAudit from '../locales/vi/admin/audit'
import viAdminChannels from '../locales/vi/admin/channels'
import viAdminOps from '../locales/vi/admin/ops'
import viAdminOverview from '../locales/vi/admin/overview'
import viAdminPlugins from '../locales/vi/admin/plugins'
import viAdminPromptAudit from '../locales/vi/admin/promptAudit'
import viAdminResources from '../locales/vi/admin/resources'
import viAdminSettings from '../locales/vi/admin/settings'
import viBatchImage from '../locales/vi/batchImage'
import viChannelMonitorV2 from '../locales/vi/channelMonitorV2'
import viCommon from '../locales/vi/common'
import viDashboard from '../locales/vi/dashboard'
import viLanding from '../locales/vi/landing'
import viMisc from '../locales/vi/misc'

// locales/{zh,en,vi}/index.ts 与 admin/index.ts 使用对象展开聚合各域模块，
// 展开模块之间若出现同名顶层键会静默覆盖。本测试将该风险固化为显式失败。
type Modules = Record<string, Record<string, unknown>>

function collisions(modules: Modules): string[] {
  const seen = new Map<string, string>()
  const out: string[] = []
  for (const [name, mod] of Object.entries(modules)) {
    for (const key of Object.keys(mod)) {
      const prev = seen.get(key)
      if (prev) {
        out.push(`"${key}" in both ${prev} and ${name}`)
      } else {
        seen.set(key, name)
      }
    }
  }
  return out
}

const roots: Record<string, Modules> = {
  zh: {
    landing: zhLanding,
    common: zhCommon,
    dashboard: zhDashboard,
    channelMonitorV2: zhChannelMonitorV2,
    batchImage: zhBatchImage,
    misc: zhMisc
  },
  en: {
    landing: enLanding,
    common: enCommon,
    dashboard: enDashboard,
    channelMonitorV2: enChannelMonitorV2,
    batchImage: enBatchImage,
    misc: enMisc
  },
  vi: {
    landing: viLanding,
    common: viCommon,
    dashboard: viDashboard,
    channelMonitorV2: viChannelMonitorV2,
    batchImage: viBatchImage,
    misc: viMisc
  }
}

const admins: Record<string, Modules> = {
  zh: {
    overview: zhAdminOverview,
    channels: zhAdminChannels,
    accounts: zhAdminAccounts,
    resources: zhAdminResources,
    ops: zhAdminOps,
    settings: zhAdminSettings,
    audit: zhAdminAudit,
    promptAudit: zhAdminPromptAudit,
    plugins: zhAdminPlugins
  },
  en: {
    overview: enAdminOverview,
    channels: enAdminChannels,
    accounts: enAdminAccounts,
    resources: enAdminResources,
    ops: enAdminOps,
    settings: enAdminSettings,
    audit: enAdminAudit,
    promptAudit: enAdminPromptAudit,
    plugins: enAdminPlugins
  },
  vi: {
    overview: viAdminOverview,
    channels: viAdminChannels,
    accounts: viAdminAccounts,
    resources: viAdminResources,
    ops: viAdminOps,
    settings: viAdminSettings,
    audit: viAdminAudit,
    promptAudit: viAdminPromptAudit,
    plugins: viAdminPlugins
  }
}

const expectedLocales = ['en', 'zh', 'vi'] as const
const expectedRootModules = ['landing', 'common', 'dashboard', 'channelMonitorV2', 'batchImage', 'misc']
const expectedAdminModules = ['overview', 'channels', 'accounts', 'resources', 'ops', 'settings', 'audit', 'promptAudit', 'plugins']

describe('locale assembly coverage', () => {
  it('declares every locale in both assembly registries', () => {
    expect(Object.keys(roots).sort()).toEqual([...expectedLocales].sort())
    expect(Object.keys(admins).sort()).toEqual([...expectedLocales].sort())
  })

  it.each(expectedLocales)('%s checks every root payload', (locale) => {
    expect(Object.keys(roots[locale] ?? {}).sort()).toEqual([...expectedRootModules].sort())
  })

  it.each(expectedLocales)('%s checks every admin payload', (locale) => {
    expect(Object.keys(admins[locale] ?? {}).sort()).toEqual([...expectedAdminModules].sort())
  })

  it('detects overlapping keys without reporting distinct keys', () => {
    expect(collisions({
      first: { shared: 'one', uniqueFirst: 'value' },
      second: { shared: 'two', uniqueSecond: 'value' }
    })).toEqual(['"shared" in both first and second'])
  })
})

describe.each(Object.keys(roots))('locale %s spread assembly', (locale) => {
  it('root modules have no overlapping top-level keys', () => {
    expect(collisions(roots[locale])).toEqual([])
  })

  it('root modules do not shadow the explicit "admin" namespace', () => {
    for (const [name, mod] of Object.entries(roots[locale])) {
      expect(Object.keys(mod), `module ${name} must not define "admin"`).not.toContain('admin')
    }
  })

  it('admin modules have no overlapping top-level keys', () => {
    expect(collisions(admins[locale])).toEqual([])
  })
})
