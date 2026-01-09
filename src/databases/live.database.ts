import Redis from "ioredis";

export type IndexParams = { message_id: number; chat_id: number };

export interface LiveDatabaseAdapter {
  add<Type extends Record<string, unknown> & { expired_at: number }>(
    type: "edited" | "replys",
    method_name: string,
    index: IndexParams,
    data: Type
  ): Promise<void>;
  delete(type: "edited" | "replys", method_name: string, message_id: number): Promise<void>;
  get<Type extends Record<string, unknown>>(
    type: "edited" | "replys",
    method_name: string,
    message_id: number
  ): Promise<(Type & { expired_at: number; chat_id: number }) | null>;

  get_messages(type: "edited" | "replys", method_name: string): Promise<number[]>;

  all_messages(type: "edited" | "replys"): Promise<{ method: string; message_id: number }[]>;
}

export class RedisLiveDatabaseAdapter implements LiveDatabaseAdapter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "tg_trader") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private data_key(type: "edited" | "replys", method_name: string): string {
    return `${this.prefix}:lives:${type}:${method_name}:data`;
  }

  private method_key(type: "edited" | "replys", method_name: string): string {
    return `${this.prefix}:lives:${type}:${method_name}:set`;
  }

  private type_key(type: "edited" | "replys"): string {
    return `${this.prefix}:lives:${type}:methods`;
  }

  async add<Type extends Record<string, unknown> & { expired_at: number }>(
    type: "edited" | "replys",
    method_name: string,
    index: IndexParams,
    data: Type
  ): Promise<void> {
    const data_str = JSON.stringify({ ...data, chat_id: index.chat_id });
    await this.db_api.hset(this.data_key(type, method_name), index.message_id.toString(), data_str);
    await this.db_api.sadd(this.method_key(type, method_name), index.message_id.toString());
    await this.db_api.sadd(this.type_key(type), method_name);
  }

  async delete(type: "edited" | "replys", method_name: string, message_id: number): Promise<void> {
    await this.db_api.hdel(this.data_key(type, method_name), message_id.toString());
    await this.db_api.srem(this.method_key(type, method_name), message_id.toString());
    await this.db_api.srem(this.type_key(type), method_name);
  }

  async get<Type extends Record<string, unknown>>(
    type: "edited" | "replys",
    method_name: string,
    message_id: number
  ): Promise<(Type & { expired_at: number; chat_id: number }) | null> {
    const data = await this.db_api.hget(this.data_key(type, method_name), message_id.toString());
    return data ? (JSON.parse(data) as Type & { expired_at: number; chat_id: number }) : null;
  }

  async get_messages(type: "edited" | "replys", method_name: string): Promise<number[]> {
    const ids = await this.db_api.smembers(this.method_key(type, method_name));
    return ids.length <= 0 ? [] : ids.map(Number);
  }

  async all_messages(type: "edited" | "replys"): Promise<{ method: string; message_id: number }[]> {
    const methods = await this.db_api.smembers(this.type_key(type));
    const messages: { method: string; message_id: number }[] = [];
    for (const method of methods) {
      const ids = await this.db_api.smembers(this.method_key(type, method));
      messages.push(...ids.map((id) => ({ method, message_id: Number(id) })));
    }
    return messages;
  }
}
