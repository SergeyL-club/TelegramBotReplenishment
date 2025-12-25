import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    open_deal_menu_methods: { type: "open_deal_menu_methods"; deal_id: number };
    callback_deal_menu_methods: { type: "callback_deal_menu_methods"; edit_id: number; method_name: string };
  }
}

export function use_deal_method_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (payload.type !== "message" || !("text" in payload.message) || !payload.message.text.startsWith("Пополнение")) return null;
    const event: DomainEvent<"open_deal_menu_methods"> = {
      type: "open_deal_menu_methods",
      chat_id: payload.message.chat.id,
      user_id: payload.message.from!.id,
      deal_id: payload.message.message_id
    };
    return event;
  });

  event_adapter.register_mapper((payload) => {
    if (payload.type !== "callback_query" || !payload.callback.message || !payload.callback.data.startsWith("callback_deal_menu_methods"))
      return null;
    const event: DomainEvent<"callback_deal_menu_methods"> = {
      type: "callback_deal_menu_methods",
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from.id,
      edit_id: payload.callback.message.message_id,
      method_name: payload.callback.data.split(":")[1]!.trim(),
    };
    return event;
  });

  default_logger.info("Registartion deal method mappers");
}
