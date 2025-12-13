import type { Redis } from "ioredis";

/* 
  Struct deal
  deal:ids set ids
  deal:status deal_id:status
  deal:method deal_id:method_name
  deal:sum deal_id:sum
  
  deal:time:create start_time
  deal:time:close start_time

  deal:is:client:users deal_id:user_id
  deal:is:client:deals user_id:deal_id

  deal:is:dealer:users deal_id:user_id
  deal:dealer:is:deals user_id:deal_id
  */
export enum Status {
  OPEN = "open",
  CLOSE = "close",
}

export class DealManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private deal_path(options: string = ""): string {
    return `${this.db_name}:deal:${options}`;
  }

  private async get_id(): Promise<number> {
    return await this.db_api.incr(this.deal_path("last_id"));
  }

  public async create_deal(user_id: number, method_name: string, sum: number, time = Date.now()): Promise<boolean> {
    const deal_id = await this.get_id();
    const status = Status.OPEN;

    const create_deal = this.db_api.multi();
    create_deal.sadd(this.deal_path("ids"), deal_id.toString());
    create_deal.hset(this.deal_path("status"), deal_id.toString(), status);
    create_deal.hset(this.deal_path("method"), deal_id.toString(), method_name);
    create_deal.hset(this.deal_path("sum"), deal_id.toString(), sum.toString());
    create_deal.hset(this.deal_path("client:users"), deal_id.toString(), user_id.toString());
    create_deal.hset(this.deal_path("client:deals"), user_id.toString(), deal_id.toString());
    create_deal.hset(this.deal_path("time:create"), deal_id.toString(), time.toString());

    const res = await create_deal.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async close_deal(deal_id: number, time = Date.now()): Promise<boolean> {
    if (!(await this.has_deal(deal_id))) return false;
    const status = Status.CLOSE;

    const update_deal = this.db_api.multi();
    update_deal.hset(this.deal_path("status"), deal_id.toString(), status);
    update_deal.hset(this.deal_path("time:close"), deal_id.toString(), time.toString());

    const res = await update_deal.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  private async has_deal(deal_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.deal_path("ids"), deal_id.toString())) > 0;
  }
}
