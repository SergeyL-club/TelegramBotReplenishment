import type { Redis } from "ioredis";
import type { EventAdapter } from "./event.adapter";

export interface ReplyStorageAdapter {
  bind(chat_id: number, user_id: number, message_id: number, data: unknown, delete_at?: number): Promise<void>;
  get(chat_id: number, user_id: number, message_id: number): Promise<{ data: unknown; delete_at?: number } | null>;
  delete(chat_id: number, user_id: number, message_id: number): Promise<void>;
  cleanup_expired(event_adapter: EventAdapter): Promise<void>;
}

export type ReplyPayload = { type: "reply_expired"; chat_id: number; user_id: number; data: unknown; message_id: number };

export class RedisReplyAdapter implements ReplyStorageAdapter {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix = "reply_bind:") {
    this.redis = redis;
    this.prefix = prefix;
  }

  private key(chat_id: number, user_id: number, message_id: number): string {
    return `${this.prefix}${chat_id}:${user_id}:${message_id}`;
  }

  public async bind(chat_id: number, user_id: number, message_id: number, data: unknown, delete_at?: number): Promise<void> {
    const value = JSON.stringify({ data, delete_at });
    await this.redis.set(this.key(chat_id, user_id, message_id), value);
  }

  public async get(chat_id: number, user_id: number, message_id: number): Promise<{ data: unknown; delete_at?: number } | null> {
    const raw = await this.redis.get(this.key(chat_id, user_id, message_id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: unknown; delete_at?: number };
    if (parsed.delete_at && parsed.delete_at < Date.now()) {
      await this.delete(chat_id, user_id, message_id);
      return null;
    }
    return parsed;
  }

  public async delete(chat_id: number, user_id: number, message_id: number): Promise<void> {
    await this.redis.del(this.key(chat_id, user_id, message_id));
  }

  public async cleanup_expired(event_adapter: EventAdapter): Promise<void> {
    const keys = await this.redis.keys(this.prefix + "*");
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (!raw) continue;
      const { data, delete_at } = JSON.parse(raw);
      if (delete_at && delete_at <= Date.now()) {
        const [chat_id, user_id, message_id] = key.slice(this.prefix.length).split(":").map(Number);

        // Создаём событие, которое потом отловит flow engine
        if (chat_id !== undefined && user_id !== undefined && message_id !== undefined)
          event_adapter.handle({ type: "reply_expired", chat_id, user_id, message_id, data });

        await this.redis.del(key);
      }
    }
  }
}
