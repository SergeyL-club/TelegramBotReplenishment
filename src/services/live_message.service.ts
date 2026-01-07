import type { Telegraf } from "telegraf";
import type { UserContextAdapter } from "../databases/user.context";
import type { DefaultContext } from "../core/telegram.types";
import type { ReplyDatabaseApadter } from "../databases/reply.database";

export interface MessageBindData {
  message_id: number;
  old_text: string;
  chat_id: number;
  expires_at: number;
  force?: boolean;
}

export class LiveMessageService {
  constructor(
    private readonly user_adapter: UserContextAdapter,
    private readonly telegraf: Telegraf<DefaultContext>,
    private readonly reply_adapter: ReplyDatabaseApadter
  ) {}

  /**
    Добавил список для того чтобы old_text менять
    
    await live_message_service.clear(app.user_id, "methods_menu");
    await live_message_service.registration(app.user_id, "methods_menu", messages_update.map((el) => ({...el, old_text: new_text })));
  
   **/
  public async registration(user_id: number, key: string, message: MessageBindData | MessageBindData[], reply = false): Promise<void> {
    await this.user_adapter.set(user_id, { [reply ? "replys" : "edited"]: { [key]: Array.isArray(message) ? message : [message] } });
  }

  public async get_ids(user_id: number, key: string, reply = false): Promise<MessageBindData[]> {
    const data = await this.user_adapter.get<{ replys: { [key]?: MessageBindData[] }; edited: { [key]?: MessageBindData[] } }>(user_id);
    if (!data || typeof data !== "object") return [];
    return reply ? (data["replys"] ? (data["replys"][key] ?? []) : []) : data["edited"] ? (data["edited"][key] ?? []) : [];
  }

  public async cleanupExpiredKeys(user_id: number, keys: string[], reply = false): Promise<{ [key: string]: MessageBindData[] }> {
    const data = await this.user_adapter.get<{ replys: { [k: string]: MessageBindData[] }; edited: { [k: string]: MessageBindData[] } }>(user_id);
    if (!data) return {};

    const container = reply ? (data.replys ?? {}) : (data.edited ?? {});
    const expiredResult: { [key: string]: MessageBindData[] } = {};

    for (const key of keys) {
      const messages = container[key] ?? [];
      if (messages.length === 0) continue;

      const now = Math.floor(Date.now() / 1000);
      const valid: MessageBindData[] = [];
      const expired: MessageBindData[] = [];

      for (const msg of messages) {
        if (msg.expires_at <= now) expired.push(msg);
        else valid.push(msg);
      }

      if (expired.length > 0) {
        expiredResult[key] = expired;
        if (reply)
          for (const message of expired) {
            await this.reply_adapter.delete(message.message_id);
            await this.telegraf.telegram.deleteMessage(message.chat_id, message.message_id);
          }
        else
          for (const message of expired)
            await this.telegraf.telegram
              .editMessageText(message.chat_id, message.message_id, undefined, "[Неактуально] " + message.old_text)
              .catch((e) => {
                if (typeof e === "object" && e !== null)
                  if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
                throw e;
              });
      }

      await this.clear(user_id, key, reply);

      if (valid.length > 0) {
        await this.user_adapter.set(user_id, { [reply ? "replys" : "edited"]: { [key]: valid } });
      }
    }

    return expiredResult;
  }

  public async clear(user_id: number, key: string, reply = false): Promise<void> {
    await this.user_adapter.set(user_id, { [reply ? "replys" : "edited"]: { [key]: undefined } });
  }
}
