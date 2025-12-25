import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    deal_create: { type: "deal_create"; delete_id: number };
  }
}

export function use_deal_create_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (payload.type !== "message" || !("text" in payload.message) || !payload.message.text.startsWith("Пополнение")) return null;
    const event: DomainEvent<"deal_create"> = {
      type: "deal_create",
      chat_id: payload.message.chat.id,
      user_id: payload.message.from!.id,
      delete_id: payload.message.message_id,
    };
    return event;
  });

  default_logger.info("Registartion deal create mappers");
}
