import type Redis from "ioredis";

export interface UserContextAdapter {
  get<Type extends Record<string, unknown>>(user_id: number): Promise<Partial<Type> | null>;
  set<Type extends Record<string, unknown>>(user_id: number, context: Type): Promise<void>;
  delete(user_id: number): Promise<void>;
}

export function deep_merge(a: Record<string, unknown>, b: Record<string, unknown>, strict = false): Record<string, unknown> {
  const result = { ...a };

  for (const key in b) {
    if (b[key] === undefined) {
      // удаляем ключ
      delete result[key];
      continue;
    }

    if (strict) {
      // в strict режиме просто заменяем
      result[key] = b[key];
      continue;
    }

    if (Array.isArray(result[key]) && Array.isArray(b[key])) {
      // объединяем массивы без дублей
      result[key] = Array.from(new Set([...result[key], ...b[key]]));
    } else if (
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key]) &&
      typeof b[key] === "object" &&
      !Array.isArray(b[key])
    ) {
      // рекурсивно сливаем объекты
      result[key] = deep_merge(result[key] as Record<string, unknown>, b[key] as Record<string, unknown>);
    } else {
      // если ключ новый или тип не совпадает — заменяем
      result[key] = b[key];
    }
  }

  return result;
}

export class RedisUserContextAdapter implements UserContextAdapter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "flow_ctx:") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private key(user_id: number): string {
    return `${this.prefix}${user_id}`;
  }

  public async get<Type extends Record<string, unknown>>(user_id: number): Promise<Partial<Type> | null> {
    const data = await this.db_api.get(this.key(user_id));
    if (!data) return null;
    try {
      return JSON.parse(data) as Partial<Type>;
    } catch {
      return null;
    }
  }

  public async set<Type extends Record<string, unknown>>(user_id: number, context: Type): Promise<void> {
    const old = (await this.get(user_id)) ?? {};
    await this.db_api.set(this.key(user_id), JSON.stringify(deep_merge(old, context)));
  }

  public async delete(user_id: number): Promise<void> {
    await this.db_api.del(this.key(user_id));
  }
}
