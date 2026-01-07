import type Redis from "ioredis";
import { deep_merge } from "./user.context";

type CreateHistory = { id: number; create_at: number; info_at: number };
type SumHistory = { sum: number; info_at: number };

export interface DealData {
  id: number;
  client: {
    user_id: number;
    chat_id: number;
    username: string;
  };
  sum: number;

  history: (CreateHistory | SumHistory)[];

  create_at: number;
}

export type DealCreataInfo = Pick<DealData, "create_at" | "client">;

export interface DealDatabaseAdapter {
  add_trader_ready(user_id: number): Promise<void>;
  delete_trader_ready(user_id: number): Promise<void>;
  trader_ready(user_id: number): Promise<boolean>;

  add_admin_ready(user_id: number): Promise<void>;
  delete_admin_ready(user_id: number): Promise<void>;
  admin_ready(user_id: number): Promise<boolean>;

  add_method(method_name: string): Promise<void>;
  delete_method(method_name: string): Promise<void>;
  get_methods(): Promise<string[]>;

  create_deal(data: DealCreataInfo): Promise<number | null>;
  get_deal(deal_id: number): Promise<DealData | null>;
  update_deal(deal_id: number, data: Partial<DealData>): Promise<void>;
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

  private async id(): Promise<number> {
    const id = await this.db_api.incr(this.key("last_id"));
    return id <= 0 ? await this.db_api.incr(this.key("last_id")) : id;
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

  public async add_method(method_name: string): Promise<void> {
    await this.db_api.sadd(this.key("methods"), method_name);
  }

  public async delete_method(method_name: string): Promise<void> {
    await this.db_api.srem(this.key("methods"), method_name);
  }

  public async get_methods(): Promise<string[]> {
    return await this.db_api.smembers(this.key("methods"));
  }

  // deal
  public async create_deal(data: DealCreataInfo): Promise<number | null> {
    const id = await this.id();
    const deal: DealData = { id, create_at: data.create_at } as DealData;
    deal.history ??= [];
    deal.history.push({ id, create_at: data.create_at, info_at: data.create_at });
    const is = await this.db_api.hset(this.key("deals"), id.toString(), JSON.stringify(deal));
    return is ? id : null;
  }

  public async get_deal(deal_id: number): Promise<DealData | null> {
    const data_str = await this.db_api.hget(this.key("deals"), deal_id.toString());
    if (data_str === null) return null;
    return JSON.parse(data_str);
  }

  public async update_deal(deal_id: number, data: Partial<DealData>): Promise<void> {
    const deal_info = await this.get_deal(deal_id);
    if (deal_info === null) return;
    if (typeof data.sum === "number") {
      data.history ??= [];
      data.history.push({ sum: data.sum, info_at: Date.now() });
    }
    await this.db_api.hset(this.key("deals"), deal_id.toString(), JSON.stringify(deep_merge(deal_info as Partial<DealData>, data)));
  }
}
