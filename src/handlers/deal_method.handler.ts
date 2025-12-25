import type { FlowEngine } from "../core/flow.engine";
import type { DealManager } from "../database/deal_manager";
import { default_logger } from "../core/logger";

export function use_deal_menu_method_handler(flow_engine: FlowEngine, deal_manager: DealManager): void {
  flow_engine.register_handler("callback_deal_menu_methods", async (event, context) => {
    const delete_id = "menu_methods" in context ? (context as any)["menu_methods"][event.deal_id] : undefined;
    const delete_ids = delete_id !== undefined ? [delete_id] : [];

    return {
      on_exit: delete_ids.map((edit_message_id) => ({ edit_message_id })),
      on_enter: {
        answerCB: true,
        text: "Выберите метод оплаты",
        inline_keyboard: [[{ text: `test1:${event.deal_id}`, callback_data: `callback_deal_method:test1:${event.deal_id}` }]],
        post: async ({ message_id, context }) => {
          (context as any)["menu_methods"] ??= {};
          (context as any)["menu_methods"][event.deal_id] = message_id;
          return { context };
        },
      },
    };
  });

  flow_engine.register_handler("callback_deal_method", async (event, context) => {
    const delete_id = "menu_methods" in context ? (context as any)["menu_methods"][event.deal_id] : undefined;
    const delete_ids = delete_id !== undefined ? [delete_id] : [];

    await deal_manager.set_method(event.deal_id, event.method_name);

    const update_ids = await deal_manager.get_deal_client_messages(event.deal_id);

    const enters = await Promise.all(
      update_ids.map(async (id) => {
        return {
          answerCB: true,
          user_id: context.user_id,
          edit_message_id: id,
          text: await deal_manager.get_info(event.deal_id),
          inline_keyboard: [
            [
              { text: "Выбрать метод оплаты", callback_data: `callback_deal_menu_methods:${event.deal_id}` },
              { text: "Ввести сумму", callback_data: `callback_deal_amount:${event.deal_id}` },
            ],
            [{ text: "Подтвердить", callback_data: `callback_deal_sented:${event.deal_id}` }],
          ],
        };
      })
    );

    return {
      on_exit: delete_ids.map((edit_message_id) => ({ edit_message_id })),
      on_enter: [
        ...enters,
        {
          post: (data) => {
            (data.context as any)["menu_methods"] ??= {};
            (data.context as any)["menu_methods"][event.deal_id] = undefined;
            return { context: data.context };
          },
        },
      ],
    };
  });

  default_logger.info("Registration deal menu methods handlers");
}
