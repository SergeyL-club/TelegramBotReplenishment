import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    callback_deal_menu_methods: { type: "callback_deal_menu_methods"; deal_id: number };
    callback_deal_method: { type: "callback_deal_method"; method_name: string; deal_id: number };
  }
}

export function use_deal_menu_methods_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (payload.type !== "callback_query" || !payload.callback.message || !payload.callback.data.startsWith("callback_deal_menu_methods"))
      return null;
    const [deal_id] = payload.callback.data.split(":").splice(1);
    const event: DomainEvent<"callback_deal_menu_methods"> = {
      type: "callback_deal_menu_methods",
      deal_id: Number(deal_id),
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from.id,
    };
    return event;
  });

  event_adapter.register_mapper((payload) => {
    if (payload.type !== "callback_query" || !payload.callback.message || !payload.callback.data.startsWith("callback_deal_method"))
      return null;
    const [method_name, deal_id] = payload.callback.data.split(":").slice(1);
    const event: DomainEvent<"callback_deal_method"> = {
      type: "callback_deal_method",
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from.id,
      deal_id: Number(deal_id),
      method_name: method_name!,
    };
    return event;
  });

  default_logger.info("Registartion deal menu methods mappers");
}
