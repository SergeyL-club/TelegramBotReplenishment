import type Redis from "ioredis";

export interface RoleDatabaseAdapter {
  get(): Promise<string[]>;
  add(role_name: string): Promise<void>;
  delete(role_name: string): Promise<void>;
}

export class RedisRoleDatabaseAdapter implements RoleDatabaseAdapter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "flow_ctx:") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private key(): string {
    return `${this.prefix}roles`;
  }

  async add(role_name: string): Promise<void> {
    await this.db_api.sadd(this.key(), role_name);
  }

  async delete(role_name: string): Promise<void> {
    await this.db_api.srem(this.key(), role_name);
  }

  async get(): Promise<string[]> {
    return await this.db_api.smembers(this.key());
  }
}
