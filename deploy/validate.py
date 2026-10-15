#!/usr/bin/env python3
"""Filtered validation for the sub2api-local source-build Compose override.

Reads `docker compose ... config --format json` on stdin. Prints ONLY booleans
and non-secret identifiers; never prints secret values. Exits non-zero if any
required assertion fails.
"""
import json
import os
import sys

ENV_FILE = "/home/duydv/.config/sub2api-local/deployment.env"
EXPECTED_CONTEXT = "/mnt/Data/AI/sub2api"
EXPECTED_VOLUMES = {
    "sub2api_data": ("sub2api-local-data", "/app/data"),
    "postgres_data": ("sub2api-local-postgres-data", "/var/lib/postgresql/data"),
    "redis_data": ("sub2api-local-redis-data", "/data"),
}
SECRET_KEYS = [
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "ADMIN_PASSWORD",
    "JWT_SECRET",
    "TOTP_ENCRYPTION_KEY",
]

results = {}


def check(name, condition):
    results[name] = bool(condition)
    return bool(condition)


def load_env(path):
    env = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


cfg = json.load(sys.stdin)
services = cfg.get("services", {})
volumes = cfg.get("volumes", {}) or {}
networks = cfg.get("networks", {}) or {}
env = load_env(ENV_FILE)

# --- app service identity / source build ---
app = services.get("sub2api", {})
build = app.get("build") or {}
if isinstance(build, str):
    build = {"context": build}
check("build_context_is_workspace", os.path.realpath(build.get("context", "")) == EXPECTED_CONTEXT)
check("build_dockerfile_root", build.get("dockerfile") == "Dockerfile")
check("image_pinned", app.get("image") == "sub2api-local:98d86915")
check("pull_policy_never", app.get("pull_policy") == "never")

# --- exact host publications: loopback + WireGuard VPN address only ---
EXPECTED_APP_BINDINGS = {
    ("127.0.0.1", "8080"),
    ("10.8.0.4", "8080"),
}
app_ports = app.get("ports", []) or []
app_bindings = {(p.get("host_ip"), str(p.get("published"))) for p in app_ports}
check("app_host_port_count_2", len(app_ports) == 2)
check("app_exact_expected_bindings", app_bindings == EXPECTED_APP_BINDINGS)
check("app_no_0.0.0.0", all(p.get("host_ip") not in ("0.0.0.0", "::", None) for p in app_ports))
check("app_no_lan_192_168_1_9", all(p.get("host_ip") != "192.168.1.9" for p in app_ports))

# --- database / redis must not publish host ports ---
check("postgres_no_host_ports", not (services.get("postgres", {}).get("ports") or []))
check("redis_no_host_ports", not (services.get("redis", {}).get("ports") or []))

# --- unique explicit resource names ---
check("container_names_unique", (
    app.get("container_name") == "sub2api-local"
    and services.get("postgres", {}).get("container_name") == "sub2api-local-postgres"
    and services.get("redis", {}).get("container_name") == "sub2api-local-redis"
))
check("network_name_unique", networks.get("sub2api-network", {}).get("name") == "sub2api-local-net")
check("volume_names_unique", all(
    volumes.get(k, {}).get("name") == v[0] for k, v in EXPECTED_VOLUMES.items()
))

# --- persistent named mounts only (no host bind mounts) ---
mount_ok = True
for key, (_name, target) in EXPECTED_VOLUMES.items():
    svc = app if key == "sub2api_data" else services.get(key.split("_")[0], {})
    vols = svc.get("volumes", []) or []
    named = [
        m for m in vols
        if m.get("type") == "volume" and m.get("source") == key and m.get("target") == target
    ]
    binds = [m for m in vols if m.get("type") == "bind"]
    if len(named) != 1 or binds:
        mount_ok = False
check("named_persistent_mounts_only", mount_ok)

# --- production security defaults preserved (inherited, not weakened) ---
check("app_no_new_privileges", "no-new-privileges:true" in (app.get("security_opt") or []))
check("app_restart_unless_stopped", app.get("restart") == "unless-stopped")
check("app_depends_on_healthy", all(
    (app.get("depends_on", {}).get(d, {}) or {}).get("condition") == "service_healthy"
    for d in ("postgres", "redis")
))
check("all_services_have_healthcheck", all(
    bool(services.get(s, {}).get("healthcheck")) for s in ("sub2api", "postgres", "redis")
))
check("no_privileged_service", all(not services.get(s, {}).get("privileged") for s in services))
check("postgres_pgdata_aligned", (
    (services.get("postgres", {}).get("environment", {}) or {}).get("PGDATA")
    == "/var/lib/postgresql/data"
))

# --- redis server requires the generated password ---
redis_cmd = services.get("redis", {}).get("command")
redis_cmd_str = " ".join(redis_cmd) if isinstance(redis_cmd, list) else str(redis_cmd or "")
check("redis_requirepass_wired", "--requirepass" in redis_cmd_str)

# --- secret file properties (booleans only, values never printed) ---
env_mode = oct(os.stat(ENV_FILE).st_mode & 0o777)
dir_mode = oct(os.stat(os.path.dirname(ENV_FILE)).st_mode & 0o777)
check("secret_dir_mode_700", dir_mode == "0o700")
check("secret_file_mode_600", env_mode == "0o600")

secrets_present = all(env.get(k, "") for k in SECRET_KEYS)
check("all_secrets_nonempty", secrets_present)
secret_values = [env.get(k, "") for k in SECRET_KEYS]
check("all_secrets_distinct", len(set(secret_values)) == len(secret_values))
check("secrets_min_length_43", all(len(v) >= 43 for v in secret_values))
check("no_placeholder_secrets", all("change" not in v.lower() for v in secret_values))

# --- required binding + admin identity ---
check("env_bind_host_loopback", env.get("BIND_HOST") == "127.0.0.1")
check("env_server_port_8080", env.get("SERVER_PORT") == "8080")
check("env_admin_email_sub2api_local", env.get("ADMIN_EMAIL") == "admin@sub2api.local")
check("env_admin_password_nonempty", bool(env.get("ADMIN_PASSWORD", "")))
check("env_postgres_user", env.get("POSTGRES_USER") == "sub2api")
check("env_no_db_host_port_override", "DATABASE_PORT" not in env)

# --- app receives the generated credentials (presence only) ---
app_env = app.get("environment", {}) or {}
check("app_gets_postgres_password", bool(app_env.get("DATABASE_PASSWORD")))
check("app_gets_redis_password", bool(app_env.get("REDIS_PASSWORD")))
check("app_gets_jwt_secret", bool(app_env.get("JWT_SECRET")))
check("app_gets_admin_email_sub2api_local", app_env.get("ADMIN_EMAIL") == "admin@sub2api.local")

# --- output ---
for name in sorted(results):
    print(f"{name}={'PASS' if results[name] else 'FAIL'}")
failed = [n for n, ok in results.items() if not ok]
print(f"total={len(results)} passed={len(results) - len(failed)} failed={len(failed)}")
sys.exit(1 if failed else 0)
