import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import enCommon from "@/i18n/locales/en/common";
import enSettings from "@/i18n/locales/en/admin/settings";
import zhCommon from "@/i18n/locales/zh/common";
import zhSettings from "@/i18n/locales/zh/admin/settings";
import viCommon from "@/i18n/locales/vi/common";
import viSettings from "@/i18n/locales/vi/admin/settings";
import SettingsView from "../SettingsView.vue";

// The app aliases vue-i18n to its runtime-only build; raw catalogs in this
// regression test need the real full build's message compiler (no i18n mock).
const { createI18n } = await vi.importActual<typeof import("vue-i18n")>(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../node_modules/vue-i18n/dist/vue-i18n.esm-bundler.js",
  ),
);

const {
  getSettings,
  updateSettings,
  getWebSearchEmulationConfig,
  updateWebSearchEmulationConfig,
  getAdminApiKey,
  getOverloadCooldownSettings,
  getRateLimit429CooldownSettings,
  updateRateLimit429CooldownSettings,
  getPanelRateLimitSettings,
  updatePanelRateLimitSettings,
  getStreamTimeoutSettings,
  getRectifierSettings,
  getBetaPolicySettings,
  getUpstreamBillingProbeSettings,
  updateUpstreamBillingProbeSettings,
  getOllamaCloudUsageSettings,
  updateOllamaCloudUsageSettings,
  getGroups,
  listProxies,
  getProviders,
  updateProvider,
  createProvider,
  deleteProvider,
  fetchPublicSettings,
  adminSettingsFetch,
  showError,
  showSuccess,
} = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getWebSearchEmulationConfig: vi.fn(),
  updateWebSearchEmulationConfig: vi.fn(),
  getAdminApiKey: vi.fn(),
  getOverloadCooldownSettings: vi.fn(),
  getRateLimit429CooldownSettings: vi.fn(),
  updateRateLimit429CooldownSettings: vi.fn(),
  getPanelRateLimitSettings: vi.fn().mockResolvedValue({
    enabled: true,
    user_rpm: 240,
    heavy_rpm: 60,
    exempt_admin: true,
    public_ip_rpm: 300,
  }),
  updatePanelRateLimitSettings: vi.fn().mockImplementation(async (payload) => payload),
  getStreamTimeoutSettings: vi.fn(),
  getRectifierSettings: vi.fn(),
  getBetaPolicySettings: vi.fn(),
  getUpstreamBillingProbeSettings: vi.fn().mockResolvedValue({
    enabled: true,
    interval_minutes: 30,
  }),
  updateUpstreamBillingProbeSettings: vi.fn().mockImplementation(async (payload) => payload),
  getOllamaCloudUsageSettings: vi.fn().mockResolvedValue({
    enabled: false,
    interval_minutes: 60,
    debounce_minutes: 1,
  }),
  updateOllamaCloudUsageSettings: vi.fn().mockImplementation(async (payload) => payload),
  getGroups: vi.fn(),
  listProxies: vi.fn(),
  getProviders: vi.fn(),
  updateProvider: vi.fn(),
  createProvider: vi.fn(),
  deleteProvider: vi.fn(),
  fetchPublicSettings: vi.fn(),
  adminSettingsFetch: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock("@/api", () => ({
  adminAPI: {
    settings: {
      getSettings,
      updateSettings,
      getWebSearchEmulationConfig,
      updateWebSearchEmulationConfig,
      getAdminApiKey,
      getOverloadCooldownSettings,
      getRateLimit429CooldownSettings,
      updateRateLimit429CooldownSettings,
      getPanelRateLimitSettings,
      updatePanelRateLimitSettings,
      getStreamTimeoutSettings,
      getRectifierSettings,
      getBetaPolicySettings,
    },
    accounts: {
      getUpstreamBillingProbeSettings,
      updateUpstreamBillingProbeSettings,
      getOllamaCloudUsageSettings,
      updateOllamaCloudUsageSettings,
    },
    groups: {
      getAll: getGroups,
    },
    proxies: {
      list: listProxies,
    },
    payment: {
      getProviders,
      updateProvider,
      createProvider,
      deleteProvider,
    },
  },
}));

vi.mock("@/stores", () => ({
  useAppStore: () => ({
    showError,
    showSuccess,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    fetchPublicSettings,
  }),
}));

vi.mock("@/stores/adminSettings", () => ({
  useAdminSettingsStore: () => ({
    fetch: adminSettingsFetch,
  }),
}));

const { copyToClipboard } = vi.hoisted(() => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/composables/useClipboard", () => ({
  useClipboard: () => ({ copyToClipboard }),
}));

vi.mock("@/utils/apiError", () => ({
  extractApiErrorMessage: () => "error",
}));

const AppLayoutStub = { template: "<div><slot /></div>" };
const ToggleStub = defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  inheritAttrs: false,
  setup(props, { attrs, emit }) {
    return () =>
      h("input", {
        ...attrs,
        class: "toggle-stub",
        type: "checkbox",
        checked: props.modelValue,
        onChange: (event: Event) => {
          emit("update:modelValue", (event.target as HTMLInputElement).checked);
        },
      });
  },
});

const SelectStub = defineComponent({
  props: {
    modelValue: {
      type: [String, Number, Boolean, null],
      default: "",
    },
    options: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit }) {
    const onChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      emit("update:modelValue", target.value);
      const option =
        (props.options as Array<Record<string, unknown>>).find(
          (item) => String(item.value ?? "") === target.value,
        ) ?? null;
      emit("change", target.value, option);
    };

    return () =>
      h(
        "select",
        {
          class: "select-stub",
          value: props.modelValue ?? "",
          "data-placeholder": props.placeholder,
          onChange,
        },
        (props.options as Array<Record<string, unknown>>).map((option) =>
          h(
            "option",
            {
              key: `${String(option.value ?? "")}:${String(option.label ?? "")}`,
              value: option.value as string,
            },
            String(option.label ?? ""),
          ),
        ),
      );
  },
});

const ImageUploadStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    uploadLabel: {
      type: String,
      default: "",
    },
    removeLabel: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    return () =>
      h("div", {
        class: "image-upload-stub",
        "data-model-value": props.modelValue,
        "data-upload-label": props.uploadLabel,
        "data-remove-label": props.removeLabel,
        "data-placeholder": props.placeholder,
      });
  },
});

const baseSettingsResponse = {
  registration_enabled: true,
  email_verify_enabled: false,
  registration_email_suffix_whitelist: [],
  promo_code_enabled: true,
  invitation_code_enabled: false,
  password_reset_enabled: false,
  totp_enabled: false,
  totp_encryption_key_configured: false,
  passkey_enabled: true,
  passkey_configured: true,
  passkey_rp_id: "sub3.nebula-spaces.com",
  passkey_rp_origins: ["https://sub3.nebula-spaces.com"],
  default_balance: 0,
  default_concurrency: 1,
  default_subscriptions: [],
  site_name: "Sub2API",
  site_logo: "",
  site_subtitle: "",
  api_base_url: "",
  contact_info: "",
  doc_url: "",
  home_content: "",
  compact_home_enabled: false,
  hide_ccs_import_button: false,
  table_default_page_size: 20,
  table_page_size_options: [10, 20, 50, 100],
  backend_mode_enabled: false,
  custom_menu_items: [],
  custom_endpoints: [],
  frontend_url: "",
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password_configured: false,
  smtp_from_email: "",
  smtp_from_name: "",
  smtp_use_tls: true,
  turnstile_enabled: false,
  turnstile_site_key: "",
  turnstile_secret_key_configured: false,
  tencent_captcha_enabled: false,
  tencent_captcha_app_id: "",
  tencent_captcha_app_secret_key_configured: false,
  tencent_captcha_cloud_secret_id_configured: false,
  tencent_captcha_cloud_secret_key_configured: false,
  api_key_acl_trust_forwarded_ip: true,
  forwarded_client_ip_headers: [],
  linuxdo_connect_enabled: false,
  linuxdo_connect_client_id: "",
  linuxdo_connect_client_secret_configured: false,
  linuxdo_connect_redirect_url: "",
  wechat_connect_enabled: true,
  wechat_connect_app_id: "wx-app-id-123",
  wechat_connect_app_secret_configured: true,
  wechat_connect_open_enabled: false,
  wechat_connect_mp_enabled: true,
  wechat_connect_mode: "mp",
  wechat_connect_scopes: "",
  wechat_connect_redirect_url:
    "https://admin.example.com/api/v1/auth/oauth/wechat/callback",
  wechat_connect_frontend_redirect_url: "/auth/wechat/callback",
  oidc_connect_enabled: false,
  oidc_connect_provider_name: "OIDC",
  oidc_connect_client_id: "",
  oidc_connect_client_secret_configured: false,
  oidc_connect_issuer_url: "",
  oidc_connect_discovery_url: "",
  oidc_connect_authorize_url: "",
  oidc_connect_token_url: "",
  oidc_connect_userinfo_url: "",
  oidc_connect_jwks_url: "",
  oidc_connect_scopes: "openid email profile",
  oidc_connect_redirect_url: "",
  oidc_connect_frontend_redirect_url: "/auth/oidc/callback",
  oidc_connect_token_auth_method: "client_secret_post",
  oidc_connect_use_pkce: true,
  oidc_connect_validate_id_token: true,
  oidc_connect_allowed_signing_algs: "RS256,ES256,PS256",
  oidc_connect_clock_skew_seconds: 120,
  oidc_connect_require_email_verified: false,
  oidc_connect_userinfo_email_path: "",
  oidc_connect_userinfo_id_path: "",
  oidc_connect_userinfo_username_path: "",
  enable_model_fallback: false,
  fallback_model_anthropic: "",
  fallback_model_openai: "",
  fallback_model_gemini: "",
  fallback_model_antigravity: "",
  grok_default_text_model: "grok-4.5",
  grok_cross_client_model_map_enabled: false,
  enable_identity_patch: false,
  identity_patch_prompt: "",
  ops_monitoring_enabled: false,
  ops_realtime_monitoring_enabled: false,
  ops_query_mode_default: "auto",
  ops_metrics_interval_seconds: 60,
  min_claude_code_version: "",
  max_claude_code_version: "",
  allow_ungrouped_key_scheduling: false,
  openai_ttft_mode: "semantic",
  enable_fingerprint_unification: true,
  enable_metadata_passthrough: false,
  enable_cch_signing: false,
  enable_claude_oauth_system_prompt_injection: true,
  claude_oauth_system_prompt: "",
  claude_oauth_system_prompt_blocks: "",
  enable_anthropic_cache_ttl_1h_injection: false,
  rewrite_message_cache_control: false,
  enable_client_dateline_normalization: true,
  antigravity_user_agent_version: "",
  openai_codex_user_agent: "",
  payment_enabled: true,
  payment_min_amount: 1,
  payment_max_amount: 10000,
  payment_daily_limit: 50000,
  payment_order_timeout_minutes: 30,
  payment_max_pending_orders: 3,
  payment_enabled_types: [],
  payment_balance_disabled: false,
  payment_balance_recharge_multiplier: 1,
  payment_subscription_usd_to_cny_rate: 0,
  payment_recharge_fee_rate: 0,
  payment_recharge_bonus_tiers: [],
  payment_recharge_bonus_mode: "bonus",
  payment_recharge_bonus_notice: "",
  payment_load_balance_strategy: "round-robin",
  payment_product_name_prefix: "",
  payment_product_name_suffix: "",
  payment_help_image_url: "",
  payment_help_text: "",
  payment_cancel_rate_limit_enabled: false,
  payment_cancel_rate_limit_max: 10,
  payment_cancel_rate_limit_window: 1,
  payment_cancel_rate_limit_unit: "day",
  payment_cancel_rate_limit_window_mode: "rolling",
  payment_visible_method_alipay_source: "alipay_direct",
  payment_visible_method_wxpay_source: "invalid-source",
  payment_visible_method_alipay_enabled: true,
  payment_visible_method_wxpay_enabled: true,
  openai_low_upstream_rate_priority_enabled: false,
  openai_oauth_scheduling_rate_multiplier: 1,
  openai_advanced_scheduler_enabled: false,
  openai_advanced_scheduler_sticky_weighted_enabled: false,
  openai_advanced_scheduler_subscription_priority_enabled: false,
  openai_advanced_scheduler_lb_top_k: "",
  openai_advanced_scheduler_weight_priority: "",
  openai_advanced_scheduler_weight_load: "",
  openai_advanced_scheduler_weight_queue: "",
  openai_advanced_scheduler_weight_error_rate: "",
  openai_advanced_scheduler_weight_ttft: "",
  openai_advanced_scheduler_weight_reset: "",
  openai_advanced_scheduler_weight_quota_headroom: "",
  openai_advanced_scheduler_weight_upstream_cost: "",
  openai_advanced_scheduler_weight_previous_response: "",
  openai_advanced_scheduler_weight_session_sticky: "",
  openai_advanced_scheduler_effective_lb_top_k: "7",
  openai_advanced_scheduler_effective_weight_priority: "1",
  openai_advanced_scheduler_effective_weight_load: "1",
  openai_advanced_scheduler_effective_weight_queue: "0.7",
  openai_advanced_scheduler_effective_weight_error_rate: "0.8",
  openai_advanced_scheduler_effective_weight_ttft: "0.5",
  openai_advanced_scheduler_effective_weight_reset: "0",
  openai_advanced_scheduler_effective_weight_quota_headroom: "0",
  openai_advanced_scheduler_effective_weight_upstream_cost: "0",
  openai_advanced_scheduler_effective_weight_previous_response: "5",
  openai_advanced_scheduler_effective_weight_session_sticky: "3",
  balance_low_notify_enabled: false,
  balance_low_notify_threshold: 0,
  balance_low_notify_recharge_url: "",
  subscription_expiry_notify_enabled: true,
  account_quota_notify_enabled: false,
  account_quota_notify_emails: [],
  // 平台限额嵌套字段（新后端契约）
  default_platform_quotas: {
    anthropic:   { daily: null, weekly: null, monthly: null },
    openai:      { daily: null, weekly: 12.5, monthly: null },
    gemini:      { daily: null, weekly: null, monthly: 200 },
    antigravity: { daily: null, weekly: null, monthly: null },
  },
};

const messages = {
  en: { ...enCommon, admin: enSettings },
  zh: { ...zhCommon, admin: zhSettings },
  vi: { ...viCommon, admin: viSettings },
};
type TestLocale = keyof typeof messages;

// Captured from the original component's raw div.textContent before migration.
// Both locales include one ASCII space at each outer edge; do not trim these.
const githubGuideBaseline = {
  en: " Setup guide: GitHub Settings → Developer settings → OAuth Apps → New OAuth App. Use your site origin as Homepage URL and the backend callback URL below as Authorization callback URL. ",
  zh: " 开通引导：GitHub Settings → Developer settings → OAuth Apps → New OAuth App；Homepage URL 填站点域名，Authorization callback URL 填下面的后端回调地址。 ",
};

// Independent expectations freeze the original English/Chinese copy byte-for-byte.
const expectedCopy = {
  en: {
    title: "Email OAuth Sign-in",
    description: "After GitHub or Google email OAuth is enabled, the system reads a verified email, signs in matching users, and auto-registers missing users.",
    githubHint: "GitHub OAuth App needs read:user user:email scopes. Use the backend callback URL below.",
    githubGuidePrefix: "Setup guide: GitHub Settings → Developer settings →",
    githubGuideSuffix: "→ New OAuth App. Use your site origin as Homepage URL and the backend callback URL below as Authorization callback URL.",
    secretConfiguredPlaceholder: "Secret configured. Leave empty to keep the current value.",
    backendCallbackUrl: "Backend Callback URL",
    generateAndCopy: "Generate and copy",
    frontendCallbackUrl: "Frontend Callback URL",
    googleHint: "Google OAuth client needs openid email profile scopes and the backend callback URL registered in credentials.",
    googleGuide: "Setup guide: Google Cloud Console → APIs & Services → OAuth consent screen, then Credentials → Create Credentials → OAuth client ID, choose Web application, and add the URL below to Authorized redirect URIs.",
    callbackUrlSetAndCopied: "Callback URL set and copied.",
  },
  zh: {
    title: "邮箱快捷登录",
    description: "开启 GitHub 或 Google 邮箱授权登录后，系统会读取已验证邮箱，存在则直接登录，不存在则自动注册。",
    githubHint: "GitHub OAuth App 需要 read:user user:email 权限，回调地址填写下方后端地址。",
    githubGuidePrefix: "开通引导：GitHub Settings → Developer settings →",
    githubGuideSuffix: "→ New OAuth App；Homepage URL 填站点域名，Authorization callback URL 填下面的后端回调地址。",
    secretConfiguredPlaceholder: "密钥已配置，留空以保留当前值。",
    backendCallbackUrl: "后端回调地址",
    generateAndCopy: "生成并复制",
    frontendCallbackUrl: "前端回跳地址",
    googleHint: "Google OAuth 客户端需要 openid email profile 范围，并在凭据里登记后端回调地址。",
    googleGuide: "开通引导：Google Cloud Console → APIs & Services → OAuth consent screen 完成同意屏幕；Credentials → Create Credentials → OAuth client ID，类型选择 Web application，并把下面地址加入 Authorized redirect URIs。",
    callbackUrlSetAndCopied: "回调地址已写入并复制。",
  },
};

function catalogCopy(locale: TestLocale) {
  return (messages[locale].admin.settings as typeof enSettings.settings).emailOAuth;
}

const wrappers: Array<ReturnType<typeof mount>> = [];

function mountView(locale: TestLocale = "en") {
  const i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    missingWarn: false,
    fallbackWarn: false,
    messages,
  });
  i18n.global.locale.value = locale;
  const wrapper = mount(SettingsView, {
    global: {
      plugins: [i18n],
      stubs: {
        AppLayout: AppLayoutStub,
        Select: SelectStub,
        Toggle: ToggleStub,
        Icon: true,
        RouterLink: { template: "<a><slot /></a>" },
        ConfirmDialog: true,
        PaymentProviderList: true,
        PaymentProviderDialog: true,
        GroupBadge: true,
        GroupOptionItem: true,
        ProxySelector: true,
        ImageUpload: ImageUploadStub,
        BackupSettings: true,
      },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, i18n };
}

async function openSecurityTab(wrapper: ReturnType<typeof mountView>["wrapper"], label: string) {
  const securityTabButton = wrapper
    .findAll("button")
    .find((node) => node.element.textContent === label);
  expect(securityTabButton).toBeDefined();
  await securityTabButton!.trigger("click");
  await flushPromises();
}

function emailOAuthCard(wrapper: ReturnType<typeof mountView>["wrapper"]) {
  const card = wrapper.findAll(".card").find((node) =>
    node.find('[data-testid="github-oauth-apps-guide-link"]').exists(),
  );
  expect(card).toBeDefined();
  return card!;
}

function expectCopy(card: ReturnType<typeof emailOAuthCard>, copy: typeof expectedCopy.en) {
  expect(card.get("h2").element.textContent).toBe(copy.title);
  expect(card.findAll("p").map((node) => node.element.textContent)).toEqual([
    copy.description,
    copy.githubHint,
    copy.googleHint,
  ]);
  expect(card.findAll('input[type="password"]').map((node) => node.attributes("placeholder")))
    .toEqual([copy.secretConfiguredPlaceholder, copy.secretConfiguredPlaceholder]);
  expect(card.findAll("label").map((node) => node.element.textContent)).toEqual([
    "Client ID", "Client Secret", copy.backendCallbackUrl, copy.frontendCallbackUrl,
    "Client ID", "Client Secret", copy.backendCallbackUrl, copy.frontendCallbackUrl,
  ]);
  expect(card.findAll("button").map((node) => node.element.textContent))
    .toEqual([copy.generateAndCopy, copy.generateAndCopy]);
  expect(card.findAll("div.rounded-lg.bg-gray-50")[1]!.element.textContent)
    .toBe(copy.googleGuide);
}

function expectGuideLink(card: ReturnType<typeof emailOAuthCard>) {
  const link = card.get('[data-testid="github-oauth-apps-guide-link"]');
  expect(link.element.textContent).toBe("OAuth Apps");
  expect(link.attributes()).toMatchObject({
    "data-testid": "github-oauth-apps-guide-link",
    href: "https://github.com/settings/developers",
    target: "_blank",
    rel: "noopener noreferrer",
    class: "font-medium text-primary-600 hover:underline dark:text-primary-400",
  });
  return link;
}

beforeEach(() => {
  vi.clearAllMocks();
    getWebSearchEmulationConfig.mockResolvedValue({
      enabled: false,
      providers: [],
    });
    updateWebSearchEmulationConfig.mockResolvedValue({
      enabled: false,
      providers: [],
    });
    getAdminApiKey.mockResolvedValue({
      exists: false,
      masked_key: "",
    });
    getOverloadCooldownSettings.mockResolvedValue({
      enabled: true,
      cooldown_minutes: 10,
    });
    getRateLimit429CooldownSettings.mockResolvedValue({
      enabled: true,
      cooldown_seconds: 5,
    });
    updateRateLimit429CooldownSettings.mockImplementation(async (payload) => payload);
    getStreamTimeoutSettings.mockResolvedValue({
      enabled: true,
      action: "temp_unsched",
      temp_unsched_minutes: 5,
      threshold_count: 3,
      threshold_window_minutes: 10,
    });
    getRectifierSettings.mockResolvedValue({
      enabled: true,
      thinking_signature_enabled: true,
      thinking_budget_enabled: true,
      apikey_signature_enabled: false,
      apikey_signature_patterns: [],
    });
    getBetaPolicySettings.mockResolvedValue({
      rules: [],
    });
    getUpstreamBillingProbeSettings.mockResolvedValue({
      enabled: true,
      interval_minutes: 30,
    });
    updateUpstreamBillingProbeSettings.mockImplementation(async (payload) => payload);
    getOllamaCloudUsageSettings.mockResolvedValue({
      enabled: false,
      interval_minutes: 60,
      debounce_minutes: 1,
    });
    updateOllamaCloudUsageSettings.mockImplementation(async (payload) => payload);
    getGroups.mockResolvedValue([]);
    listProxies.mockResolvedValue({
      items: [],
    });
    getProviders.mockResolvedValue({
      data: [],
    });
    fetchPublicSettings.mockResolvedValue(undefined);
    adminSettingsFetch.mockResolvedValue(undefined);
  getSettings.mockResolvedValue({
    ...baseSettingsResponse,
    api_base_url: "https://api.example.com/api/v1/",
    github_oauth_enabled: true,
    github_oauth_client_secret_configured: true,
    github_oauth_redirect_url: "",
    google_oauth_enabled: true,
    google_oauth_client_secret_configured: true,
    google_oauth_redirect_url: "",
  });
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.clearAllMocks();
});

describe("SettingsView Email OAuth catalog translations", () => {
  it.each(["en", "zh"] as const)("preserves the exact %s catalog and visible copy", async (locale) => {
    expect(catalogCopy(locale)).toEqual(expectedCopy[locale]);
    const { wrapper, i18n } = mountView(locale);
    await flushPromises();
    await openSecurityTab(wrapper, i18n.global.t("admin.settings.tabs.security"));
    expectCopy(emailOAuthCard(wrapper), expectedCopy[locale]);
  });

  it.each(["en", "zh"] as const)("preserves the raw %s GitHub guide baseline and link attributes", async (locale) => {
    const { wrapper, i18n } = mountView(locale);
    await flushPromises();
    await openSecurityTab(wrapper, i18n.global.t("admin.settings.tabs.security"));
    const link = expectGuideLink(emailOAuthCard(wrapper));
    expect(link.element.parentElement!.textContent).toBe(githubGuideBaseline[locale]);
  });

  it("renders Vietnamese copy from the real catalog without CJK in the Email OAuth card", async () => {
    const { wrapper, i18n } = mountView("vi");
    await flushPromises();
    await openSecurityTab(wrapper, i18n.global.t("admin.settings.tabs.security"));
    const card = emailOAuthCard(wrapper);
    expect(card.get("h2").element.textContent).not.toBe(expectedCopy.en.title);
    const copy = catalogCopy("vi");
    expect(copy).toBeDefined();
    expectCopy(card, copy);
    const link = expectGuideLink(card);
    expect(link.element.parentElement!.textContent)
      .toBe(` ${copy.githubGuidePrefix} OAuth Apps ${copy.githubGuideSuffix} `);
    expect(card.element.textContent).not.toMatch(/\p{Script=Han}/u);
    for (const input of card.findAll("input")) {
      expect(input.attributes("placeholder") ?? "").not.toMatch(/\p{Script=Han}/u);
    }
  });

  it.each(["en", "zh", "vi"] as const)("sets and copies both callback URLs with the %s toast", async (locale) => {
    const { wrapper, i18n } = mountView();
    await flushPromises();
    await openSecurityTab(wrapper, i18n.global.t("admin.settings.tabs.security"));
    // Switch the real composer's locale on an already mounted component.
    i18n.global.locale.value = locale;
    await flushPromises();
    const card = emailOAuthCard(wrapper);
    const buttons = card.findAll("button");
    expect(buttons).toHaveLength(2);
    for (const [index, provider] of (["github", "google"] as const).entries()) {
      await buttons[index]!.trigger("click");
      await flushPromises();
      const url = `https://api.example.com/api/v1/auth/oauth/${provider}/callback`;
      expect(copyToClipboard).toHaveBeenNthCalledWith(index + 1, url, catalogCopy(locale).callbackUrlSetAndCopied);
      expect(card.get<HTMLInputElement>(`input[placeholder="https://your-domain.com/api/v1/auth/oauth/${provider}/callback"]`).element.value)
        .toBe(url);
    }
    expect(copyToClipboard).toHaveBeenCalledTimes(2);
  });
});
