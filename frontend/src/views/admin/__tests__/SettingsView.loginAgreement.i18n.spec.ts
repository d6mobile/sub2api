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

async function openAgreementTab(wrapper: ReturnType<typeof mountView>["wrapper"], label: string) {
  const agreementTabButton = wrapper
    .findAll("button")
    .find((node) => node.element.textContent === label);
  expect(agreementTabButton).toBeDefined();
  await agreementTabButton!.trigger("click");
  await flushPromises();
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
    login_agreement_enabled: true,
    login_agreement_mode: "modal",
    login_agreement_updated_at: "2026-03-31",
    login_agreement_documents: [
      { id: "terms", title: "Terms of Service", content_md: "# Terms\nPolicy content." },
      { id: "usage-policy", title: "Usage Policy", content_md: "# Usage\nUsage content." },
    ],
  });
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.clearAllMocks();
});


type ViewWrapper = ReturnType<typeof mountView>["wrapper"];

function agreementCard(wrapper: ViewWrapper) {
  const card = wrapper.findAll(".card").find((node) =>
    node.find('input[placeholder="usage-policy"]').exists(),
  );
  expect(card).toBeDefined();
  return card!;
}

async function openAgreement(wrapper: ViewWrapper, i18n: ReturnType<typeof mountView>["i18n"]) {
  await flushPromises();
  await openAgreementTab(wrapper, i18n.global.t("admin.settings.tabs.agreement"));
  expect(agreementCard(wrapper).isVisible()).toBe(true);
}

async function readRenderedCopy(wrapper: ViewWrapper) {
  const card = agreementCard(wrapper);
  const heading = card.get("h2").element.parentElement!;
  const toggle = card.get<HTMLInputElement>("input.toggle-stub");
  const modes = card.get(".grid.grid-cols-2").findAll("button");
  const modeContainer = modes[0]!.element.parentElement!.parentElement!;
  const date = card.get('input[type="date"]').element.parentElement!;
  const documents = card.get("h3").element.parentElement!;
  const document = card.get(".mt-4.space-y-3 > div");
  const documentLabels = document.findAll("label");
  const title = document.get<HTMLInputElement>('input[type="text"]');
  const copy = {
    title: heading.querySelector("h2")!.textContent,
    description: heading.querySelector("p")!.textContent,
    statusEnabled: toggle.element.previousElementSibling!.textContent,
    displayModeLabel: modeContainer.querySelector("label")!.textContent,
    modeModal: modes[0]!.element.textContent,
    modeCheckbox: modes[1]!.element.textContent,
    modeModalHint: modeContainer.querySelector("p")!.textContent,
    updatedAtLabel: date.querySelector("label")!.textContent,
    updatedAtHint: date.querySelector("p")!.textContent,
    documentsTitle: documents.querySelector("h3")!.textContent,
    documentsDescription: documents.querySelector("p")!.textContent,
    addDocument: card.get("button.btn-primary").element.textContent,
    documentTitleLabel: documentLabels[0]!.element.textContent,
    documentTitlePlaceholder: title.attributes("placeholder"),
    routeSlugLabel: documentLabels[1]!.element.textContent,
    markdownContentLabel: documentLabels[2]!.element.textContent,
    markdownContentPlaceholder: document.get("textarea").attributes("placeholder"),
  };
  await modes[1]!.trigger("click");
  const modeCheckboxHint = modeContainer.querySelector("p")!.textContent;
  await modes[0]!.trigger("click");
  expect(modeContainer.querySelector("p")!.textContent).toBe(copy.modeModalHint);
  await toggle.setValue(false);
  const statusDisabled = toggle.element.previousElementSibling!.textContent;
  await toggle.setValue(true);
  expect(toggle.element.previousElementSibling!.textContent).toBe(copy.statusEnabled);
  // Empty the displayed title through the real input, rather than changing the
  // persisted seed titles. This also exercises the untitled fallback branch.
  await title.setValue("");
  const untitledDocument = document.get("p.truncate.font-semibold").element.textContent;
  await title.setValue("Terms of Service");
  expect(document.get("p.truncate.font-semibold").element.textContent).toBe("Terms of Service");
  for (const repeatedDocument of card.findAll(".mt-4.space-y-3 > div")) {
    expect(repeatedDocument.findAll("label").map((node) => node.element.textContent)).toEqual([
      copy.documentTitleLabel, copy.routeSlugLabel, copy.markdownContentLabel,
    ]);
    expect(repeatedDocument.get('input[type="text"]').attributes("placeholder"))
      .toBe(copy.documentTitlePlaceholder);
    expect(repeatedDocument.get("textarea").attributes("placeholder"))
      .toBe(copy.markdownContentPlaceholder);
  }
  return { ...copy, statusDisabled, modeCheckboxHint, untitledDocument };
}

// Independent original literals. Raw textContent is never trimmed; any outer
// whitespace emitted next to an Icon stub is part of the rendered contract.
const originalCopy = {
  "en": {
    "title": "Login agreement",
    "description": "Control whether the login page requires users to accept Markdown policy documents first.",
    "statusEnabled": "Enabled",
    "statusDisabled": "Disabled",
    "displayModeLabel": "Display mode",
    "modeModal": " Modal",
    "modeCheckbox": " Checkbox",
    "modeCheckboxHint": "The checkbox appears below the login button and gates all login actions.",
    "modeModalHint": "The modal opens on the login page and gates all login actions until accepted.",
    "updatedAtLabel": "Updated date",
    "updatedAtHint": "Changing the date or content requires fresh consent.",
    "documentsTitle": "Agreement documents",
    "documentsDescription": "Document titles are customizable and content is saved as Markdown.",
    "addDocument": " Add document",
    "untitledDocument": "Untitled document",
    "documentTitleLabel": "Document title",
    "documentTitlePlaceholder": "Example: Terms of Service",
    "routeSlugLabel": "Route slug",
    "markdownContentLabel": "Markdown content",
    "markdownContentPlaceholder": "Write the final Markdown content here."
  },
  "zh": {
    "title": "登录条款确认",
    "description": "控制登录页是否要求用户先阅读并同意服务条款、隐私政策或其他 Markdown 文档。",
    "statusEnabled": "已启用",
    "statusDisabled": "未启用",
    "displayModeLabel": "展示形式",
    "modeModal": " 弹窗",
    "modeCheckbox": " 复选框",
    "modeCheckboxHint": "复选框会显示在登录按钮下方，未勾选前所有登录入口禁用。",
    "modeModalHint": "弹窗会在登录页打开，用户拒绝后所有登录入口保持禁用。",
    "updatedAtLabel": "条款更新日期",
    "updatedAtHint": "日期或文档内容变化后，用户需要重新同意。",
    "documentsTitle": "协议文档",
    "documentsDescription": "文档名称可自定义，内容按 Markdown 保存。可参考：服务条款、使用政策、支持的国家和地区、服务特定条款。",
    "addDocument": " 添加文档",
    "untitledDocument": "未命名文档",
    "documentTitleLabel": "文档名称",
    "documentTitlePlaceholder": "例如：服务条款",
    "routeSlugLabel": "路由标识",
    "markdownContentLabel": "Markdown 内容",
    "markdownContentPlaceholder": "在这里填写正式 Markdown 内容。"
  }
} as const;
const originalValidation = {
  "en": {
    "errorDocumentRequired": "At least one document is required when login agreement is enabled.",
    "errorTitleEmpty": "Login agreement document title cannot be empty.",
    "errorRouteDuplicate": "Login agreement document routes cannot be duplicated: /legal/{id}"
  },
  "zh": {
    "errorDocumentRequired": "启用登录条款确认时，至少需要保留一份文档。",
    "errorTitleEmpty": "登录条款文档名称不能为空。",
    "errorRouteDuplicate": "登录条款文档路由不能重复：/legal/{id}"
  }
} as const;
const newKeys = [
  ...Object.keys(originalCopy.en).filter((key) => key !== "statusEnabled"),
  ...Object.keys(originalValidation.en),
];

function catalogCopy(locale: TestLocale): Record<string, string> {
  return (Reflect.get(messages[locale].admin.settings, "loginAgreement") as Record<string, string> | undefined) ?? {};
}

function renderedCatalogCopy(locale: TestLocale) {
  const copy = catalogCopy(locale);
  return {
    ...Object.fromEntries(Object.keys(originalCopy.en).map((key) => [key, copy[key]])),
    statusEnabled: messages[locale].common.enabled,
    modeModal: ` ${copy.modeModal}`,
    modeCheckbox: ` ${copy.modeCheckbox}`,
    addDocument: ` ${copy.addDocument}`,
  };
}

describe("SettingsView login agreement original raw baseline", () => {
  it.each(["en", "zh"] as const)("preserves each original %s textContent and placeholder byte", async (locale) => {
    const { wrapper, i18n } = mountView(locale);
    await openAgreement(wrapper, i18n);
    const rendered = await readRenderedCopy(wrapper);
    expect(rendered).toEqual(originalCopy[locale]);
  });
});

describe("SettingsView login agreement catalog translations", () => {
  it.each(["en", "zh"] as const)("keeps exact original %s literals in the catalog", (locale) => {
    const copy = renderedCatalogCopy(locale);
    expect(copy).toEqual(originalCopy[locale]);
    expect(Object.fromEntries(Object.keys(originalValidation[locale]).map((key) => [key, catalogCopy(locale)[key]])))
      .toEqual(originalValidation[locale]);
  });

  it("defines all Vietnamese keys without CJK or English fallback", () => {
    const copy = catalogCopy("vi");
    for (const key of newKeys) {
      expect(copy, key).toHaveProperty(key);
      expect(copy[key], key).toBeTypeOf("string");
      expect(copy[key], key).not.toBe("");
      expect(copy[key], key).not.toMatch(/\p{Script=Han}/u);
      expect(copy[key], key).not.toBe(catalogCopy("en")[key]);
    }
  });

  it("renders Vietnamese from the real catalog across both modes and statuses without CJK", async () => {
    const { wrapper, i18n } = mountView("vi");
    await openAgreement(wrapper, i18n);
    const rendered = await readRenderedCopy(wrapper);
    expect(rendered).toEqual(renderedCatalogCopy("vi"));
    expect(rendered.title).toBe("Điều khoản đăng nhập");
    const card = agreementCard(wrapper);
    expect(card.element.textContent).not.toMatch(/\p{Script=Han}/u);
    for (const field of card.findAll("input, textarea")) {
      expect(field.attributes("placeholder") ?? "").not.toMatch(/\p{Script=Han}/u);
    }
  });

  it.each(["en", "zh", "vi"] as const)("keeps persisted seed titles unchanged for %s", async (locale) => {
    getSettings.mockResolvedValue({ ...baseSettingsResponse, login_agreement_documents: [] });
    const { wrapper } = mountView(locale);
    await flushPromises();
    expect(agreementCard(wrapper).findAll('input.input[type="text"]').map((node) => (node.element as HTMLInputElement).value))
      .toEqual(locale === "zh"
        ? ["服务条款", "使用政策", "支持的国家和地区", "服务特定条款"]
        : ["Terms of Service", "Usage Policy", "Supported Countries and Regions", "Service-Specific Terms"]);
  });

  describe.each(["en", "zh", "vi"] as const)("%s validation", (locale) => {
    it.each(["errorDocumentRequired", "errorTitleEmpty", "errorRouteDuplicate"] as const)("submits %s and stops before saving", async (errorKey) => {
      const { wrapper, i18n } = mountView(locale);
      await openAgreement(wrapper, i18n);
      const card = agreementCard(wrapper);
      const documents = () => card.findAll(".mt-4.space-y-3 > div");
      if (errorKey === "errorDocumentRequired") {
        // The UI correctly prevents deleting the last enabled document. Turn it
        // off, remove all documents, then re-enable before actual form submit.
        await card.get("input.toggle-stub").setValue(false);
        while (documents().length) {
          await documents()[0]!.get("button").trigger("click");
        }
        await card.get("input.toggle-stub").setValue(true);
      } else if (errorKey === "errorTitleEmpty") {
        // Keep Markdown nonempty so save normalization does not filter it out.
        await documents()[0]!.get('input[type="text"]').setValue("   ");
      } else {
        await documents()[1]!.get('input[placeholder="usage-policy"]').setValue("terms");
      }
      showError.mockClear();
      await wrapper.get("form").trigger("submit");
      await flushPromises();
      const expected = catalogCopy(locale)[errorKey]?.replace("{id}", "terms");
      expect(showError).toHaveBeenCalledTimes(1);
      expect(showError).toHaveBeenCalledWith(expected);
      expect(updateSettings).not.toHaveBeenCalled();
      expect(updateWebSearchEmulationConfig).not.toHaveBeenCalled();
      if (locale !== "vi") {
        expect(showError).toHaveBeenCalledWith(originalValidation[locale][errorKey].replace("{id}", "terms"));
      }
    });
  });
});
