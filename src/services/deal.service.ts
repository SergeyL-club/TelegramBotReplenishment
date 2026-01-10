import type { NonVoid } from "../core/telegram.composer";
import type { DealDatabaseAdapter, DealData } from "../databases/deal.database";

export class DealService {
  constructor(private readonly deal_adapter: DealDatabaseAdapter) {}

  async get_deal(deal_id: number): Promise<DealData | null> {
    return await this.deal_adapter.get_deal(deal_id);
  }

  async registration_deal(client_id: number, create_at?: number): Promise<number> {
    return await this.deal_adapter.registration_deal(client_id, create_at);
  }

  async registration_amount(deal_id: number, amount: NonVoid<DealData["amount"]>): Promise<void> {
    await this.deal_adapter.registration_amount(deal_id, amount);
  }
}
