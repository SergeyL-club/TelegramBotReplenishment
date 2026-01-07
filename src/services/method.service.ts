import type { DealDatabaseAdapter } from "../databases/deal.database";

export class MethodService {
  constructor(private readonly deal_adapter: DealDatabaseAdapter) {}

  public async get_method_names(): Promise<string[]> {
    return await this.deal_adapter.get_methods();
  }

  public async add_method_name(method_name: string): Promise<void> {
    await this.deal_adapter.add_method(method_name);
  }

  public async del_method_name(method_name: string): Promise<void> {
    await this.deal_adapter.delete_method(method_name);
  }
}
