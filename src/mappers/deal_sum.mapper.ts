import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    callback_deal_amount: { type: "callback_deal_amount"; deal_id: number };
    reply_deal_amount: { type: "reply_deal_amount"; amount_str: string; deal_id: number; delete_ids: number[] };
  }
}

export function use_deal_sum_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (
      payload.type !== "callback_query" ||
      !payload.callback.message ||
      !("text" in payload.callback.message) ||
      !payload.callback.data.startsWith("callback_deal_amount")
    )
      return null;
    const [deal_id] = payload.callback.data.split(":").slice(1);
    const event: DomainEvent<"callback_deal_amount"> = {
      type: "callback_deal_amount",
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from.id,
      deal_id: Number(deal_id),
    };
    return event;
  });

  event_adapter.register_mapper((payload) => {
    if (payload.type !== "reply_message" || !payload.bind_data || !("text" in payload.message)) return null;
    const { deal_id, type } = payload.bind_data as { deal_id: number; type: string };
    if (!type || !type.startsWith("reply_deal_amount")) return null;
    const event: DomainEvent<"reply_deal_amount"> = {
      type: "reply_deal_amount",
      chat_id: payload.message.chat.id,
      user_id: payload.message.from!.id,
      deal_id: deal_id,
      amount_str: payload.message.text,
      delete_ids: [payload.message.message_id, payload.reply_to.message_id],
    };
    return event;
  });

  default_logger.info("Registartion deal sum mappers");
}
