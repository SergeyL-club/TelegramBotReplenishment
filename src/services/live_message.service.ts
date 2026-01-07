import type { UserContextAdapter } from "../databases/user.context";

export interface MessageBindData {
  message_id: number;
  chat_id: number;
  expires_at: number;
  force?: boolean;
}

export class LiveMessageService {
  constructor(private readonly user_adapter: UserContextAdapter) {}

  public async registration(user_id: number, key: string, message: MessageBindData, reply = false): Promise<void> {
    await this.user_adapter.set(user_id, { [reply ? "replys" : "edited"]: { [key]: [message] } });
  }

  public async get_ids(user_id: number, key: string, reply = false): Promise<MessageBindData[]> {
    const data = await this.user_adapter.get<{ replys: { [key]?: MessageBindData[] }; edited: { [key]?: MessageBindData[] } }>(user_id);
    if (!data || typeof data !== "object") return [];
    return reply ? (data["replys"] ? (data["replys"][key] ?? []) : []) : data["edited"] ? (data["edited"][key] ?? []) : [];
  }

  public async clear(user_id: number, key: string, reply = false): Promise<void> {
    await this.user_adapter.set(user_id, { [reply ? "replys" : "edited"]: { [key]: undefined } });
  }
}
