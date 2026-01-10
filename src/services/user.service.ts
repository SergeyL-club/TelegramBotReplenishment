import type { NonVoid } from "../core/telegram.composer";
import type { DealDatabaseAdapter } from "../databases/deal.database";
import type { UserContextAdapter } from "../databases/user.context";

export class UserService {
  constructor(
    private readonly user_adapter: UserContextAdapter,
    private readonly deal_adapter: DealDatabaseAdapter
  ) {}

  public async users(): Promise<number[]> {
    return await this.user_adapter.all();
  }

  public async save_user(data: { user_id: number; chat_id: number; username: string | undefined }): Promise<void> {
    await this.user_adapter.set(data.user_id, data);
  }

  public async get_user(user_id: number): Promise<{ user_id: number; chat_id: number; username: string | undefined } | null> {
    const data = await this.user_adapter.get<{ user_id: number; chat_id: number; username: string | undefined }>(user_id);
    return data ? data as NonVoid<{ user_id: number; chat_id: number; username: string | undefined }> : null;
  }

  public async admin_ready(user_id: number): Promise<boolean> {
    return await this.deal_adapter.admin_ready(user_id);
  }

  public async all_admin_ready(): Promise<number[]> {
    return await this.deal_adapter.all_admin_ready();
  }

  public async add_admin_ready(user_id: number): Promise<void> {
    await this.deal_adapter.add_admin_ready(user_id);
  }

  public async del_admin_ready(user_id: number): Promise<void> {
    await this.deal_adapter.delete_admin_ready(user_id);
  }

  public async trader_ready(user_id: number): Promise<boolean> {
    return await this.deal_adapter.trader_ready(user_id);
  }

  public async all_trader_ready(): Promise<number[]> {
    return await this.deal_adapter.all_trader_ready();
  }

  public async add_trader_ready(user_id: number): Promise<void> {
    await this.deal_adapter.add_trader_ready(user_id);
  }

  public async del_trader_ready(user_id: number): Promise<void> {
    await this.deal_adapter.delete_trader_ready(user_id);
  }
}
