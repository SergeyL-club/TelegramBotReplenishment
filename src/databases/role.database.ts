import type Redis from "ioredis";

export interface RoleDatabaseAdapter {
  get(role_name: string): Promise<number[]>;
  add(role_name: string, user_id: number): Promise<void>;
  delete(role_name: string, user_id: number): Promise<void>;
  add_user_ready(role_name: string, user_id: number): Promise<void>;
  delete_user_ready(role_name: string, user_id: number): Promise<void>;
  user_ready(role_name: string): Promise<number[]>;
}

export class RedisRoleDatabaseAdapter implements RoleDatabaseAdapter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "flow_ctx:") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private key(role_name: string): string {
    return `${this.prefix}roles:${role_name}`;
  }

  async add(role_name: string, user_id: number): Promise<void> {
    await this.db_api.sadd(this.key(role_name), user_id);
  }

  async delete(role_name: string, user_id: number): Promise<void> {
    await this.db_api.srem(this.key(role_name), user_id);
  }

  async get(role_name: string): Promise<number[]> {
    return (await this.db_api.smembers(this.key(role_name))).map(Number);
  }

  async add_user_ready(role_name: string, user_id: number): Promise<void> {
    await this.add(`ready:${role_name}`, user_id);
  }

  async delete_user_ready(role_name: string, user_id: number): Promise<void> {
    await this.delete(`ready:${role_name}`, user_id);
  }

  async user_ready(role_name: string): Promise<number[]> {
    return await this.get(`ready:${role_name}`);
  }
}
