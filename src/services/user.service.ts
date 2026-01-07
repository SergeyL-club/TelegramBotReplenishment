import { DealDatabaseAdapter } from "../databases/deal.database";
import type { UserContextAdapter } from "../databases/user.context";

export class UserService {
  constructor(
    private readonly user_adapter: UserContextAdapter,
    private readonly deal_adapter: DealDatabaseAdapter
  ) {}

  public async save_user(data: { user_id: number; chat_id: number; username: string | undefined }) {
    await this.user_adapter.set(data.user_id, data);
  }

  public async admin_ready(user_id: number): Promise<boolean> {
    return await this.deal_adapter.admin_ready(user_id);
  }

  public async add_admin_ready(user_id: number): Promise<void> {
    await this.deal_adapter.add_admin_ready(user_id);
  }

  public async del_admin_ready(user_id: number): Promise<void> {
    await this.deal_adapter.delete_admin_ready(user_id);
  }
}
