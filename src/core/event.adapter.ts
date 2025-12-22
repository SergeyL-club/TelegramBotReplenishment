import type { ReplyStorageAdapter, ReplyPayload } from "./reply_storage.adapter";
import type { telegram_payload } from "./telegram.adapter";

export type DomainBase = { user_id: number; chat_id: number };

export type DomainEvent = ({ type: "reply_expired"; message_id: number } | { type: "unknown"; payload: unknown }) & DomainBase;

type Payload = telegram_payload | ReplyPayload;

type event_mapper = (payload: Payload & { bind_data?: unknown }) => Promise<DomainEvent | null> | DomainEvent | null;

export class EventAdapter {
  private mappers: event_mapper[] = [];

  public constructor(private readonly reply_adapter: ReplyStorageAdapter) {}

  public register_mapper(mapper: event_mapper): void {
    this.mappers.push(mapper);
  }

  public async handle(payload: Payload): Promise<DomainEvent> {
    const user_id: number = payload.type === "reply_expired" ? payload.user_id : (payload.ctx.from?.id ?? 0);
    const chat_id: number = payload.type === "reply_expired" ? payload.chat_id : (payload.ctx.chat?.id ?? 0);
    // Если это reply_message, проверяем через ReplyAdapter
    if (payload.type === "reply_message" && this.reply_adapter) {
      const bind = await this.reply_adapter.get(payload.ctx.chat!.id, payload.ctx.from!.id, payload.reply_to.message_id);
      if (!bind) {
        // Нет привязки — сообщение не ожидается
        return { type: "unknown", chat_id, user_id, payload };
      }
      // Можно передавать bind_data в event, если нужно
      (payload as any).bind_data = bind.data;
    }

    // Пробуем пройтись по зарегистрированным мапперам
    for (const mapper of this.mappers) {
      const event = await mapper(payload);
      if (event !== null) return event;
    }

    // ни один маппер не подошел → unknown
    return { type: "unknown", chat_id, user_id, payload };
  }
}
