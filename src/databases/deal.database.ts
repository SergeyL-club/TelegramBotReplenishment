import type Redis from "ioredis";

export interface DealDatabaseAdapter {
  add_trader_ready(user_id: number): Promise<void>;
  delete_trader_ready(user_id: number): Promise<void>;
  trader_ready(user_id: number): Promise<boolean>;

  add_admin_ready(user_id: number): Promise<void>;
  delete_admin_ready(user_id: number): Promise<void>;
  admin_ready(user_id: number): Promise<boolean>;
}

export class RedisDealDatabaseAdapter implements DealDatabaseAdapter {
  private db_api: Redis;
  private prefix: string;

  constructor(db_api: Redis, prefix = "flow_ctx:") {
    this.db_api = db_api;
    this.prefix = prefix;
  }

  private key(prefix?: string): string {
    return `${this.prefix}deals${prefix ? ":" + prefix : ""}`;
  }

  public async add_trader_ready(user_id: number): Promise<void> {
    await this.db_api.sadd(this.key("trader:ready"), user_id);
  }

  public async delete_trader_ready(user_id: number): Promise<void> {
    await this.db_api.srem(this.key("trader:ready"), user_id);
  }

  public async trader_ready(user_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.key("trader:ready"), user_id)) > 0;
  }

  public async add_admin_ready(user_id: number): Promise<void> {
    await this.db_api.sadd(this.key("admin:ready"), user_id);
  }

  public async delete_admin_ready(user_id: number): Promise<void> {
    await this.db_api.srem(this.key("admin:ready"), user_id);
  }

  public async admin_ready(user_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.key("admin:ready"), user_id)) > 0;
  }
}
