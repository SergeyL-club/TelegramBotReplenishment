import type { FlowEngine } from "../core/flow.engine";
import type { DealManager } from "../database/deal_manager";
import { default_logger } from "../core/logger";

export function use_deal_sum_handler(flow_engine: FlowEngine, deal_manager: DealManager): void {
  flow_engine.register_handler("callback_deal_amount", async (event, context) => {
    const delete_id = "sum_messages" in context ? (context as any)["sum_messages"][event.deal_id] : undefined;
    const delete_ids = delete_id !== undefined ? [delete_id] : [];

    return {
      on_exit: delete_ids.map((edit_message_id) => ({ edit_message_id })),
      on_enter: {
        answerCB: true,
        text: "Введите сумму",
        force_reply: true,
        bind_data: { deal_id: event.deal_id, type: "reply_deal_amount" },
        post: async ({ message_id, context }) => {
          (context as any)["sum_messages"] ??= {};
          (context as any)["sum_messages"][event.deal_id] = message_id;
          return { context };
        },
      },
    };
  });

  flow_engine.register_handler("reply_deal_amount", async (event) => {
    const amount = Number(event.amount_str);
    if (Number.isNaN(amount))
      return {
        on_exit: event.delete_ids.map((edit_message_id) => ({ edit_message_id })),
        on_enter: {
          text: `Некорректная сумма ${amount} (${event.amount_str}), введите повторно`,
          force_reply: true,
          bind_data: { deal_id: event.deal_id, type: "reply_deal_amount" },
          post: async ({ message_id, context }) => {
            (context as any)["sum_messages"] ??= {};
            (context as any)["sum_messages"][event.deal_id] = message_id;
            return { context };
          },
        },
      };

    await deal_manager.set_amount(event.deal_id, amount);

    const messages = await deal_manager.get_deal_client_messages(event.deal_id);
    const info = await deal_manager.get_info(event.deal_id);

    return {
      on_exit: event.delete_ids.map((edit_message_id) => ({ edit_message_id })),
      on_enter: [
        ...messages.map((edit_message_id) => ({
          edit_message_id,
          text: info,
          inline_keyboard: [
            [
              { text: "Выбрать метод оплаты", callback_data: `callback_deal_menu_methods:${event.deal_id}` },
              { text: "Ввести сумму", callback_data: `callback_deal_amount:${event.deal_id}` },
            ],
            [{ text: "Подтвердить", callback_data: `callback_deal_sented:${event.deal_id}` }],
          ],
        })),
        {
          post: (data) => {
            (data.context as any)["sum_messages"] ??= {};
            (data.context as any)["sum_messages"][event.deal_id] = undefined;
            return { context: data.context };
          },
        },
      ],
    };
  });

  default_logger.info("Registration deal sum handlers");
}
