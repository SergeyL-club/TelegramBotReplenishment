import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    callback_deal_sented: { type: "callback_deal_sented"; deal_id: number };
  }
}

export function use_deal_sented_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (
      payload.type !== "callback_query" ||
      !payload.callback.message ||
      !("text" in payload.callback.message) ||
      !payload.callback.data.startsWith("callback_deal_sented")
    )
      return null;
    const [deal_id] = payload.callback.data.split(":").slice(1);
    const event: DomainEvent<"callback_deal_sented"> = {
      type: "callback_deal_sented",
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from.id,
      deal_id: Number(deal_id),
    };
    return event;
  });

  default_logger.info("Registartion deal sented mappers");
}
