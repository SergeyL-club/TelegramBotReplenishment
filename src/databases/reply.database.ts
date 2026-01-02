import type Redis from "ioredis";

export interface ReplyDatabaseApadter {
  get<Type extends Record<string, unknown>>(message_id: number): Promise<Type | null>;
  add<Type extends Record<string, unknown>>(message_id: number, data: Type): Promise<void>;
  delete(message_id: number): Promise<void>;
}

export class RedisReplyDatabaseApadter implements ReplyDatabaseApadter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "flow_ctx:") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private key(): string {
    return `${this.prefix}replys`;
  }

  async add<Type extends Record<string, unknown>>(message_id: number, data: Type): Promise<void> {
    await this.db_api.hset(this.key(), message_id.toString(), JSON.stringify(data));
  }

  async delete(message_id: number): Promise<void> {
    await this.db_api.hdel(this.key(), message_id.toString());
  }

  async get<Type extends Record<string, unknown>>(message_id: number): Promise<Type | null> {
    const data = await this.db_api.hget(this.key(), message_id.toString());
    return data ? (JSON.parse(data) as Type) : null;
  }
}
