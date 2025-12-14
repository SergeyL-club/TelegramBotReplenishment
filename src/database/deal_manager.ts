import type Redis from "ioredis";

export enum States {
  OPEN = "open",
  STEP_1 = "step1",
  STEP_2 = "step2",
  FINISH = "finish",
  CLOSE = "close",
}
export type StatesValue = (typeof States)[keyof typeof States];

export interface DealData {
  id: number;
  state: StatesValue;
  client_id: number;
  trader_id: number;
  details: string;
  create_at: number;
  update_at?: {
    finish_at?: number;
    close_at?: number;
    step_1_at?: number;
    step_2_at?: number;
  };
}

export class DealManager {
  public constructor(
    private db_api: Redis,
    db_name = "tg_trader"
  ) {
    this.deal_ids = `${db_name}:deals:ids`;
    this.deal_states = `${db_name}:deals:states`;
    this.deal_details = `${db_name}:deals:details`;
    this.deal_creation_times = `${db_name}:deals:creation_times`;

    this.deal_s1_ids = `${db_name}:deals:s1:ids`;
    this.deal_s1_creation_times = `${db_name}:deals:s1:creation_times`;

    this.deal_s2_ids = `${db_name}:deals:s2:ids`;
    this.deal_s2_creation_times = `${db_name}:deals:s2:creation_times`;

    this.deal_close_ids = `${db_name}:deals:close:ids`;
    this.deal_close_creation_times = `${db_name}:deals:close:creation_times`;

    this.deal_finish_ids = `${db_name}:deals:finish:ids`;
    this.deal_finish_creation_times = `${db_name}:deals:finish:creation_times`;

    this.deal_clients = `${db_name}:deals:clients`;
    this.deal_traders = `${db_name}:deals:traders`;
    this.last_id = `${db_name}:deals:last_id`;
  }

  private last_id;
  private deal_ids;
  private deal_states;
  private deal_details;
  private deal_clients;
  private deal_traders;
  private deal_creation_times;

  // step 1
  private deal_s1_ids;
  private deal_s1_creation_times;

  // step 2
  private deal_s2_ids;
  private deal_s2_creation_times;

  // close
  private deal_close_ids;
  private deal_close_creation_times;

  // finish
  private deal_finish_ids;
  private deal_finish_creation_times;

  // Генерация идентификатора
  private async generation_id(): Promise<number> {
    return await this.db_api.incr(this.last_id);
  }

  // Проверка наличие сделки
  public async verification_by_deal_id(deal_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.deal_ids, deal_id.toString())) > 0;
  }

  // Получения списком сделок
  public async deals_all(): Promise<number[] | null> {
    const data = await this.db_api.smembers(this.deal_ids);
    return data.length > 0 ? data.map(Number) : null;
  }
  public async deals_step(step: 1 | 2): Promise<number[] | null> {
    const path = step === 1 ? this.deal_s1_ids : this.deal_s2_ids;
    const data = await this.db_api.smembers(path);
    return data.length > 0 ? data.map(Number) : null;
  }
  public async deals_close(): Promise<number[] | null> {
    const data = await this.db_api.smembers(this.deal_close_ids);
    return data.length > 0 ? data.map(Number) : null;
  }
  public async deals_finish(): Promise<number[] | null> {
    const data = await this.db_api.smembers(this.deal_finish_ids);
    return data.length > 0 ? data.map(Number) : null;
  }

  // Получение данных о сделке
  public async state_by_deal_id(deal_id: number): Promise<StatesValue | null> {
    return (await this.db_api.hget(this.deal_states, deal_id.toString())) as StatesValue | null;
  }
  public async details_by_deal_id(deal_id: number): Promise<string | null> {
    return await this.db_api.hget(this.deal_details, deal_id.toString());
  }
  public async creation_time_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_creation_times, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async close_time_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_close_creation_times, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async finish_time_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_finish_creation_times, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async step_1_time_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_s1_creation_times, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async step_2_time_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_s2_creation_times, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async client_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_clients, deal_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async trader_by_deal_id(deal_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.deal_traders, deal_id.toString());
    return data !== null ? Number(data) : null;
  }

  // Функции сделки
  public async create_deal(client_id: number, trader_id: number, details: string, create_at = Date.now()): Promise<number | false> {
    const deal_id = await this.generation_id();
    const multi = this.db_api.multi();

    multi.sadd(this.deal_ids, deal_id.toString());
    multi.hset(this.deal_clients, deal_id.toString(), client_id.toString());
    multi.hset(this.deal_traders, deal_id.toString(), trader_id.toString());
    multi.hset(this.deal_states, deal_id.toString(), States.OPEN);
    multi.hset(this.deal_details, deal_id.toString(), details);
    multi.hset(this.deal_creation_times, deal_id.toString(), create_at.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ? deal_id : false;
  }
  public async close_deal(deal_id: number, close_at = Date.now()): Promise<boolean> {
    if (!(await this.verification_by_deal_id(deal_id))) return false;
    const multi = this.db_api.multi();

    multi.sadd(this.deal_close_ids, deal_id.toString());
    multi.hset(this.deal_states, deal_id.toString(), States.CLOSE);
    multi.hset(this.deal_close_creation_times, deal_id.toString(), close_at.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }
  public async step_1(deal_id: number, update_at = Date.now()): Promise<boolean> {
    if (!(await this.verification_by_deal_id(deal_id))) return false;
    const multi = this.db_api.multi();

    multi.sadd(this.deal_s1_ids, deal_id.toString());
    multi.hset(this.deal_states, deal_id.toString(), States.STEP_1);
    multi.hset(this.deal_s1_creation_times, deal_id.toString(), update_at.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }
  public async step_2(deal_id: number, update_at = Date.now()): Promise<boolean> {
    if (!(await this.verification_by_deal_id(deal_id))) return false;
    const multi = this.db_api.multi();

    multi.sadd(this.deal_s2_ids, deal_id.toString());
    multi.hset(this.deal_states, deal_id.toString(), States.STEP_2);
    multi.hset(this.deal_s2_creation_times, deal_id.toString(), update_at.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }
  public async finish_deal(deal_id: number, update_at = Date.now()): Promise<boolean> {
    if (!(await this.verification_by_deal_id(deal_id))) return false;
    const multi = this.db_api.multi();

    multi.sadd(this.deal_finish_ids, deal_id.toString());
    multi.hset(this.deal_states, deal_id.toString(), States.FINISH);
    multi.hset(this.deal_finish_creation_times, deal_id.toString(), update_at.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }

  // Весь блок сделки
  public async data_by_deal_id(deal_id: number): Promise<DealData | null> {
    if (!(await this.verification_by_deal_id(deal_id))) return null;
    const deal: DealData = {} as DealData;
    const [state, details, client_id, trader_id, create_at] = await Promise.all([
      this.state_by_deal_id(deal_id),
      this.details_by_deal_id(deal_id),
      this.client_by_deal_id(deal_id),
      this.trader_by_deal_id(deal_id),
      this.creation_time_by_deal_id(deal_id),
    ]);

    deal.id = deal_id;
    deal.state = state!;
    deal.details = details!;
    deal.client_id = client_id!;
    deal.trader_id = trader_id!;
    deal.create_at = create_at!;

    if (deal.state === States.STEP_1) deal.update_at = { ...deal.update_at, step_1_at: (await this.step_1_time_by_deal_id(deal_id))! };
    if (deal.state === States.STEP_2) deal.update_at = { ...deal.update_at, step_2_at: (await this.step_2_time_by_deal_id(deal_id))! };
    if (deal.state === States.CLOSE) deal.update_at = { ...deal.update_at, close_at: (await this.close_time_by_deal_id(deal_id))! };
    if (deal.state === States.FINISH) deal.update_at = { ...deal.update_at, finish_at: (await this.finish_time_by_deal_id(deal_id))! };

    return deal;
  }
}
