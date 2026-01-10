import type { Telegraf } from "telegraf";
import type { DefaultContext } from "../core/telegram.types";
import type { ReplyDatabaseApadter } from "../databases/reply.database";
import type { LiveDatabaseAdapter, IndexParams } from "../databases/live.database";

export class LiveMessageService {
  constructor(
    private readonly live_adapter: LiveDatabaseAdapter,
    private readonly telegraf: Telegraf<DefaultContext>,
    private readonly reply_adapter: ReplyDatabaseApadter
  ) {}

  public async registration<Type extends Record<string, unknown> & { expired_at: number }>(
    type: "edited" | "replys",
    method_name: string,
    index: IndexParams,
    message: (Type & { expired_at: number }) | (Type & { expired_at: number }[])
  ): Promise<void> {
    const messages = Array.isArray(message) ? message : [message];
    for (const data of messages) {
      await this.live_adapter.add(type, method_name, index, data);
    }
  }

  public async get_messages<Type extends Record<string, unknown>>(
    type: "edited" | "replys",
    method_name: string
  ): Promise<(Type & { message_id: number; expired_at: number; chat_id: number })[]> {
    const ids = await this.live_adapter.get_messages(type, method_name);
    const messages: (Type & { message_id: number; expired_at: number; chat_id: number })[] = [];
    for (const id of ids) {
      const data = await this.live_adapter.get<Type>(type, method_name, id);
      if (data) messages.push({ ...data, message_id: id });
    }
    return messages;
  }

  public async cleanupExpiredKeys(type: "edited" | "replys"): Promise<{ method: string; message_id: number }[]> {
    const messages = await this.live_adapter.all_messages(type);

    const expired: { method: string; message_id: number }[] = [];

    for (const { method, message_id } of messages) {
      const now = Math.floor(Date.now() / 1000);
      const data = await this.live_adapter.get<{ deal_id: number; reply_methods: string[] }>(type, method, message_id);
      if (data && data.expired_at <= now) {
        expired.push({ method, message_id });
        if (type === "edited" && "old_text" in data) {
          await this.telegraf.telegram.editMessageText(data.chat_id, message_id, undefined, "[Неактуальный] " + data.old_text);
          if ("reply_methods" in data) {
            for (const method of data.reply_methods) await this.clear("replys", method, data.deal_id);
          }
        } else if (type === "replys") {
          await this.telegraf.telegram.deleteMessage(data.chat_id, message_id);
          await this.reply_adapter.delete(message_id);
        }
      }
    }

    for (const { method, message_id } of expired) {
      await this.live_adapter.delete(type, method, message_id);
    }

    return expired;
  }

  async clear(type: "edited" | "replys", method_name: string, deal_id?: number | number[]): Promise<void> {
    const ids = await this.live_adapter.get_messages(type, method_name);
    for (const id of ids) {
      const data = await this.live_adapter.get<{ deal_id: number }>(type, method_name, id);
      if (
        data &&
        typeof data.deal_id === "number" &&
        (typeof deal_id === "undefined" ||
          (!Array.isArray(deal_id) && deal_id === data.deal_id) ||
          (Array.isArray(deal_id) && deal_id.includes(data.deal_id)))
      ) {
        await this.telegraf.telegram.deleteMessage(data.chat_id, id);
        await this.live_adapter.delete(type, method_name, id);
        await this.telegraf.telegram.deleteMessage(data.chat_id, id);
        if (type === "replys") await this.reply_adapter.delete(id);
      }
    }
  }
}
