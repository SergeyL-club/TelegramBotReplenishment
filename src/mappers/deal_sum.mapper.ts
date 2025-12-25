import type { EventAdapter, DomainEvent } from "../core/event.adapter";
import { default_logger } from "../core/logger";

declare module "../core/event.adapter" {
  interface DomainEventMap {
    callback_menu_reply_deal_sum: {
      type: "callback_menu_reply_deal_sum";
      pre_deal_id: number;
      edit_id: number;
    };
    open_reply_deal_sum: {
      type: "open_reply_deal_sum";
      pre_deal_id: number;
      delete_ids: number[];
      edit_id: number;
      text: string;
    };
  }
}

export function use_deal_sum_mapper(event_adapter: EventAdapter): void {
  event_adapter.register_mapper((payload) => {
    if (payload.type !== "callback_query" || !payload.callback.message || !payload.callback.data.startsWith("callback_menu_reply_deal_sum"))
      return null;
    const [_, pre_deal_id, edit_id] = payload.callback.data.split(":");
    if (!pre_deal_id || !edit_id) return null;
    const event: DomainEvent<"callback_menu_reply_deal_sum"> = {
      type: "callback_menu_reply_deal_sum",
      chat_id: payload.callback.message.chat.id,
      user_id: payload.callback.from!.id,
      pre_deal_id: Number(pre_deal_id),
      edit_id: Number(edit_id),
    };
    return event;
  });

  event_adapter.register_mapper((payload) => {
    if (payload.type !== "reply_message" || !("text" in payload.message) || !payload.bind_data) return null;
    const bind = payload.bind_data as { pre_deal_id: number; edit_id: number };
    const event: DomainEvent<"open_reply_deal_sum"> = {
      type: "open_reply_deal_sum",
      chat_id: payload.message.chat.id,
      user_id: payload.message.from!.id,
      pre_deal_id: bind.pre_deal_id,
      edit_id: bind.edit_id,
      delete_ids: [payload.reply_to.message_id, payload.message.message_id],
      text: payload.message.text,
    };
    return event;
  });

  default_logger.info("Registartion deal method mappers");
}
