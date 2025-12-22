import type { Redis } from "ioredis";

export interface ContextStorageAdapter {
  get(user_id: number): Promise<Record<string, unknown> | null>;
  set(user_id: number, context: Record<string, unknown>): Promise<void>;
  delete(user_id: number): Promise<void>;
}

export class RedisContextAdapter implements ContextStorageAdapter {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix = "flow_ctx:") {
    this.redis = redis;
    this.prefix = prefix;
  }

  private key(user_id: number): string {
    return `${this.prefix}${user_id}`;
  }

  public async get(user_id: number): Promise<Record<string, unknown> | null> {
    const data = await this.redis.get(this.key(user_id));
    if (!data) return null;
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  public async set(user_id: number, context: Record<string, unknown>): Promise<void> {
    await this.redis.set(this.key(user_id), JSON.stringify(context));
  }

  public async delete(user_id: number): Promise<void> {
    await this.redis.del(this.key(user_id));
  }
}
