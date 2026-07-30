/**
 * Tiny pluggable key/value persistence used by the dashboard (author
 * profile edits) and the newsletter (subscribers, rate limits).
 *
 * Driver selection is automatic, in this order:
 *
 * 1. `redis-rest` — used when an Upstash/Vercel KV REST endpoint is
 *    configured (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the
 *    `UPSTASH_REDIS_REST_*` equivalents). This is the driver to use in
 *    production: it survives deploys and works on serverless hosts.
 * 2. `file`   — JSON files under `NJ_DATA_DIR` (default `.data/`). Great
 *    for local development and any long-lived Node server.
 * 3. `memory` — last-resort fallback when the filesystem is read-only.
 *    Data lives for the lifetime of the process only.
 *
 * Set `NJ_STORE_DRIVER` to force one. No SDKs are required — the REST
 * driver talks to Upstash over plain `fetch`.
 */

export type StoreDriverName = "redis-rest" | "file" | "memory";

export interface StoreDriver {
  readonly name: StoreDriverName;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** Keys are namespaced with `nj:`; prefix is matched against that. */
  keys(prefix: string): Promise<string[]>;
}

const NAMESPACE = "nj:";
const namespaced = (key: string) => `${NAMESPACE}${key}`;

/* -------------------------------------------------------------------- */
/* memory                                                                */
/* -------------------------------------------------------------------- */

// Held on globalThis so Next.js dev-server module reloads don't wipe it.
const globalMemory = globalThis as typeof globalThis & {
  __njMemoryStore?: Map<string, string>;
};
const memoryMap = (globalMemory.__njMemoryStore ??= new Map<string, string>());

const memoryDriver: StoreDriver = {
  name: "memory",
  async get<T>(key: string) {
    const raw = memoryMap.get(namespaced(key));
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set<T>(key: string, value: T) {
    memoryMap.set(namespaced(key), JSON.stringify(value));
  },
  async delete(key: string) {
    memoryMap.delete(namespaced(key));
  },
  async keys(prefix: string) {
    const full = namespaced(prefix);
    return [...memoryMap.keys()]
      .filter((k) => k.startsWith(full))
      .map((k) => k.slice(NAMESPACE.length));
  },
};

/* -------------------------------------------------------------------- */
/* file                                                                  */
/* -------------------------------------------------------------------- */

const dataDir = () => process.env.NJ_DATA_DIR || ".data";

/** `nj:subscriber:a@b.com` -> `.data/subscriber__a%40b.com.json` */
const filePath = async (key: string) => {
  const path = await import("node:path");
  return path.join(dataDir(), `${encodeURIComponent(key)}.json`);
};

function createFileDriver(): StoreDriver {
  return {
    name: "file",
    async get<T>(key: string) {
      const fs = await import("node:fs/promises");
      try {
        const raw = await fs.readFile(await filePath(key), "utf8");
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T) {
      const fs = await import("node:fs/promises");
      await fs.mkdir(dataDir(), { recursive: true });
      // Write-then-rename so a crash mid-write can't truncate the record.
      const target = await filePath(key);
      const temp = `${target}.${Date.now()}.tmp`;
      await fs.writeFile(temp, JSON.stringify(value, null, 2), "utf8");
      await fs.rename(temp, target);
    },
    async delete(key: string) {
      const fs = await import("node:fs/promises");
      await fs.rm(await filePath(key), { force: true });
    },
    async keys(prefix: string) {
      const fs = await import("node:fs/promises");
      try {
        const names = await fs.readdir(dataDir());
        return names
          .filter((n) => n.endsWith(".json"))
          .map((n) => decodeURIComponent(n.replace(/\.json$/, "")))
          .filter((k) => k.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

/* -------------------------------------------------------------------- */
/* redis-rest (Upstash / Vercel KV)                                      */
/* -------------------------------------------------------------------- */

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function createRedisDriver(config: { url: string; token: string }): StoreDriver {
  const command = async (...args: (string | number)[]) => {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.map(String)),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`KV request failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`KV error: ${body.error}`);
    return body.result ?? null;
  };

  return {
    name: "redis-rest",
    async get<T>(key: string) {
      const result = await command("GET", namespaced(key));
      return typeof result === "string" ? (JSON.parse(result) as T) : null;
    },
    async set<T>(key: string, value: T) {
      await command("SET", namespaced(key), JSON.stringify(value));
    },
    async delete(key: string) {
      await command("DEL", namespaced(key));
    },
    async keys(prefix: string) {
      const found: string[] = [];
      let cursor = "0";
      do {
        const result = (await command(
          "SCAN",
          cursor,
          "MATCH",
          `${namespaced(prefix)}*`,
          "COUNT",
          1000
        )) as [string, string[]];
        cursor = result[0];
        found.push(...result[1].map((k) => k.slice(NAMESPACE.length)));
      } while (cursor !== "0");
      return found;
    },
  };
}

/* -------------------------------------------------------------------- */

let cached: StoreDriver | null = null;
let fileDriverBroken = false;

function selectDriver(): StoreDriver {
  const forced = process.env.NJ_STORE_DRIVER as StoreDriverName | undefined;
  const redis = redisConfig();

  if (forced === "memory") return memoryDriver;
  if (forced === "file") return createFileDriver();
  if (forced === "redis-rest" || (!forced && redis)) {
    if (redis) return createRedisDriver(redis);
    throw new Error(
      "NJ_STORE_DRIVER=redis-rest but KV_REST_API_URL/KV_REST_API_TOKEN are not set."
    );
  }
  return createFileDriver();
}

export function getStore(): StoreDriver {
  if (!cached) cached = selectDriver();
  if (cached.name !== "file" || fileDriverBroken) return cached;

  // The file driver can't work on a read-only filesystem (some serverless
  // runtimes). Degrade to memory on the first write failure instead of
  // surfacing an ENOENT/EROFS to the editor mid-save.
  const file = cached;
  const guarded: StoreDriver = {
    ...file,
    async set(key, value) {
      try {
        await file.set(key, value);
      } catch (error) {
        fileDriverBroken = true;
        cached = memoryDriver;
        console.warn(
          "[store] filesystem is not writable, falling back to in-memory storage. " +
            "Configure KV_REST_API_URL/KV_REST_API_TOKEN to persist data.",
          error
        );
        await memoryDriver.set(key, value);
      }
    },
  };
  return guarded;
}

/** Human-readable driver name, surfaced in the dashboard footer. */
export function activeStoreDriver(): StoreDriverName {
  return getStore().name;
}
