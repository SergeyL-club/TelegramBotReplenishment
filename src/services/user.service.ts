import type { UserContextAdapter } from "../databases/user.context";

export class UserService {
  constructor(private readonly user_adapter: UserContextAdapter) {}

  public async save_user(data: { user_id: number; chat_id: number; username: string | undefined }) {
    await this.user_adapter.set(data.user_id, data);
  }
}
