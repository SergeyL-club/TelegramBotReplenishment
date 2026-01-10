import type Redis from "ioredis";
import type { NonVoid } from "../core/telegram.composer";

type CreateAt = { type: "create"; at: number };
type UpdateState = { type: "update_state"; state: string; at: number };
type AddMethodName = { type: "add_method"; method_name: string; at: number };
type AddAmount = { type: "add_amount"; amount: number; at: number };
type AddDetails = { type: "add_details"; details: string; at: number };
type SendNotifyAdmin = { type: "send_admin"; messages: { chat_id: number; message_id: number }[]; at: number };
type SendNotifyTrader = { type: "send_trader"; messages: { chat_id: number; message_id: number }[]; at: number };
type ClientOkAt = { type: "client_ok"; at: number };
type TraderOkAt = { type: "client_ok"; at: number };
type CloseAt = { type: "close"; at: number };
type FinishAt = { type: "finish"; at: number };
export type AllNotify =
  | CreateAt
  | UpdateState
  | AddMethodName
  | AddAmount
  | AddDetails
  | SendNotifyAdmin
  | SendNotifyTrader
  | ClientOkAt
  | TraderOkAt
  | CloseAt
  | FinishAt;

export interface DealData {
  id: number;

  state?: "add_pre" | "add_details" | "client_ok" | "trader_ok" | "close" | "finish" | "support";

  amount?: number;
  method_name?: string;
  details?: string;

  client_id: number;
  trader_id?: number;

  history: AllNotify[];
  create_at: number;
}

export interface DealDatabaseAdapter {
  add_trader_ready(user_id: number): Promise<void>;
  delete_trader_ready(user_id: number): Promise<void>;
  trader_ready(user_id: number): Promise<boolean>;
  all_trader_ready(): Promise<number[]>;

  add_admin_ready(user_id: number): Promise<void>;
  delete_admin_ready(user_id: number): Promise<void>;
  admin_ready(user_id: number): Promise<boolean>;
  all_admin_ready(): Promise<number[]>;

  add_method(method_name: string): Promise<void>;
  delete_method(method_name: string): Promise<void>;
  get_methods(): Promise<string[]>;

  get_deal(deal_id: number): Promise<DealData | null>;
  registration_deal(client_id: number, create_at?: number): Promise<number>;
  registration_method_name(deal_id: number, method_name: NonVoid<DealData["method_name"]>): Promise<void>;
  registration_amount(deal_id: number, amount: NonVoid<DealData["amount"]>): Promise<void>;
  registration_details(deal_id: number, details: NonVoid<DealData["details"]>): Promise<void>;
  registration_state(deal_id: number, state: NonVoid<DealData["state"]>): Promise<void>;
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

  public async all_trader_ready(): Promise<number[]> {
    return (await this.db_api.smembers(this.key("trader:ready"))).map(Number);
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

  public async all_admin_ready(): Promise<number[]> {
    return (await this.db_api.smembers(this.key("admin:ready"))).map(Number);
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
  private async has_deal(deal_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.key("deals:all"), deal_id.toString())) > 0;
  }

  public async get_deal(deal_id: number): Promise<DealData | null> {
    const data_str = await this.db_api.hget(this.key("deals:data"), deal_id.toString());
    if (!data_str) return null;
    const data: Omit<DealData, "notifications" | "history"> = JSON.parse(data_str);
    const history = (await this.db_api.lrange(this.key(`deals:history:${deal_id}`), 0, -1)).map((el) => JSON.parse(el));

    return { ...data, history };
  }

  public async registration_deal(client_id: number, create_at = Date.now()): Promise<number> {
    const deal_id = await this.id();
    const data: Pick<DealData, "id" | "client_id" | "create_at"> = { id: deal_id, client_id, create_at };
    await this.db_api.hset(this.key("deals:data"), deal_id.toString(), JSON.stringify(data));
    await this.db_api.sadd(this.key("deals:all"), deal_id.toString());
    const create_history: CreateAt = { at: create_at, type: "create" };
    await this.db_api.lpush(this.key(`deals:history:${deal_id}`), JSON.stringify(create_history));
    await this.registration_state(deal_id, "add_pre");
    return deal_id;
  }

  public async registration_method_name(deal_id: number, method_name: NonVoid<DealData["method_name"]>): Promise<void> {
    if (!(await this.has_deal(deal_id))) return;
    const data_str = await this.db_api.hget(this.key("deals:data"), deal_id.toString());
    if (!data_str) return;
    const data: Omit<DealData, "notifications" | "history"> = JSON.parse(data_str);
    await this.db_api.hset(this.key("deals:data"), deal_id.toString(), JSON.stringify({ ...data, method_name }));
    const add_history: AddMethodName = { type: "add_method", at: Date.now(), method_name };
    await this.db_api.lpush(this.key(`deals:history:${deal_id}`), JSON.stringify(add_history));
  }

  public async registration_amount(deal_id: number, amount: NonVoid<DealData["amount"]>): Promise<void> {
    if (!(await this.has_deal(deal_id))) return;
    const data_str = await this.db_api.hget(this.key("deals:data"), deal_id.toString());
    if (!data_str) return;
    const data: Omit<DealData, "notifications" | "history"> = JSON.parse(data_str);
    await this.db_api.hset(this.key("deals:data"), deal_id.toString(), JSON.stringify({ ...data, amount }));
    const add_history: AddAmount = { type: "add_amount", at: Date.now(), amount };
    await this.db_api.lpush(this.key(`deals:history:${deal_id}`), JSON.stringify(add_history));
  }

  public async registration_details(deal_id: number, details: NonVoid<DealData["details"]>): Promise<void> {
    if (!(await this.has_deal(deal_id))) return;
    const data_str = await this.db_api.hget(this.key("deals:data"), deal_id.toString());
    if (!data_str) return;
    const data: Omit<DealData, "notifications" | "history"> = JSON.parse(data_str);
    await this.db_api.hset(this.key("deals:data"), deal_id.toString(), JSON.stringify({ ...data, details }));
    const add_history: AddDetails = { type: "add_details", at: Date.now(), details };
    await this.db_api.lpush(this.key(`deals:history:${deal_id}`), JSON.stringify(add_history));
  }

  public async registration_state(deal_id: number, state: NonVoid<DealData["state"]>): Promise<void> {
    if (!(await this.has_deal(deal_id))) return;
    const data_str = await this.db_api.hget(this.key("deals:data"), deal_id.toString());
    if (!data_str) return;
    const data: Omit<DealData, "notifications" | "history"> = JSON.parse(data_str);
    await this.db_api.hset(this.key("deals:data"), deal_id.toString(), JSON.stringify({ ...data, state }));
    if (data.state) await this.db_api.srem(this.key(`deals:${data.state}`), deal_id.toString());
    await this.db_api.sadd(this.key(`deals:${state}`), deal_id.toString());
    const add_history: UpdateState = { type: "update_state", at: Date.now(), state };
    await this.db_api.lpush(this.key(`deals:history:${deal_id}`), JSON.stringify(add_history));
  }
}
