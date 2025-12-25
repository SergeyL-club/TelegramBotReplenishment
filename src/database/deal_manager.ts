import type Redis from "ioredis";

interface DealData {
  id: number;
  amount?: number;
  method_name?: string;
  details?: string;
  client_id: number;
  trader_id?: number;
  messages?: {
    client?: number[]; // Список сообщений которые нужно обновлять по сделки
    trader?: number[]; // список по сделки у trader
    traders?: number[]; // Все рассылки traders по сделке
  };
  created_at: number;
  updates?: {
    method_name?: { method_name: string; time: number }[]; // История обновления метода оплаты
    amount?: { amount: number; time: number }[]; // История обновления суммы
    details?: { detais: string; time: number }[]; // История обновления суммы
    sented_at?: number;
    trader_at?: number; // когда принял заявку trader
    accepted_at?: number; // Когда client подтвердил пополнение
    confirmed_at?: number; // Когда trader подтвердил пополнение
    close_at?: number; // Закрылась сделка из-за timeout или других причин
  };
}

export class DealManager {
  constructor(
    private db_api: Redis,
    db_name = "tg_trader"
  ) {
    this.path_id = `${db_name}:deal:last_id`;
    this.deal_path = (id): string => `${db_name}:deal:${id}`;
    this.client_path = (id): string => `${db_name}:deal:client:${id}:deals`
  }

  private path_id;
  private deal_path: (id: number) => string;
  private client_path: (id: number) => string;

  private async last_id(): Promise<number> {
    const id = await this.db_api.incr(this.path_id);
    return id <= 0 ? await this.db_api.incr(this.path_id) : id;
  }

  private async get_deal(deal_id: number): Promise<DealData | null> {
    const data = await this.db_api.get(this.deal_path(deal_id));
    return data ? (JSON.parse(data) as DealData) : null;
  }
  private async save_deal(deal: DealData): Promise<void> {
    await this.db_api.sadd(this.client_path(deal.client_id), deal.id);
    await this.db_api.set(this.deal_path(deal.id), JSON.stringify(deal));
  }
  public async create_deal(client_id: number): Promise<DealData> {
    const deal: DealData = { id: await this.last_id(), client_id, created_at: Date.now(), updates: {} };
    await this.save_deal(deal);
    return deal;
  }
  public async set_client_messages(deal_id: number, ids: number[]): Promise<void> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    deal.messages ??= {};
    deal.messages.client ??= [];
    deal.messages.client.push(...ids);
    await this.save_deal(deal);
  }
  public async set_amount(deal_id: number, amount: number): Promise<void> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    deal.amount = amount;
    const time = Date.now();
    deal.updates ??= {};
    deal.updates.amount ??= [];
    deal.updates.amount.push({ amount, time });
    await this.save_deal(deal);
  }
  public async set_method(deal_id: number, method_name: string): Promise<void> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    deal.method_name = method_name;
    const time = Date.now();
    deal.updates ??= {};
    deal.updates.method_name ??= [];
    deal.updates.method_name.push({ method_name, time });
    await this.save_deal(deal);
  }
  public async set_details(deal_id: number, details: string): Promise<void> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    deal.details = details;
    const time = Date.now();
    deal.updates ??= {};
    deal.updates.details ??= [];
    deal.updates.details.push({ detais: details, time });
    await this.save_deal(deal);
  }
  public async get_deal_client_messages(deal_id: number): Promise<number[]> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    if (deal.messages && deal.messages.client) return deal.messages.client;
    return [];
  }
  public async get_info(deal_id: number): Promise<string> {
    const deal = await this.get_deal(deal_id);
    if (!deal) throw new Error("Deal not found");
    const logs: string[] = [];
    logs.push(`[${new Date(deal.created_at).toLocaleString()}] Создана сделка #${deal.id}`);
    if (deal.updates?.amount) {
      for (const a of deal.updates.amount) {
        logs.push(`[${new Date(a.time).toLocaleString()}] Задана сумма ${a.amount}`);
      }
    }
    if (deal.updates?.method_name) {
      for (const m of deal.updates.method_name) {
        logs.push(`[${new Date(m.time).toLocaleString()}] Задан метод оплаты ${m.method_name}`);
      }
    }
    if (deal.updates?.details) {
      for (const d of deal.updates.details) {
        logs.push(`[${new Date(d.time).toLocaleString()}] Заданы реквизиты ${d.detais}`);
      }
    }
    if (deal.updates?.accepted_at) {
      logs.push(`[${new Date(deal.updates.accepted_at).toLocaleString()}] Клиент подтвердил пополнение`);
    }
    if (deal.updates?.confirmed_at) {
      logs.push(`[${new Date(deal.updates.confirmed_at).toLocaleString()}] Трейдер подтвердил пополнение`);
    }
    if (deal.updates?.close_at) {
      logs.push(`[${new Date(deal.updates.close_at).toLocaleString()}] Сделка закрыта`);
    }
    return `Сделка #${deal.id}\nКлиент: ${deal.client_id}\nТрейдер: ${deal.trader_id ?? "не назначен"}\nМетод оплаты: ${deal.method_name ?? "не выбран"}\nСумма: ${deal.amount ?? "не задана"}\nДетали: ${deal.details ?? "нет"}\nЛоги:\n${logs.join("\n")}`;
  }
}
