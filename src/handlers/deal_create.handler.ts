import type { FlowEngine } from "../core/flow.engine";
import type { DealManager } from "../database/deal_manager";
import { default_logger } from "../core/logger";

export function use_deal_create_handler(flow_engine: FlowEngine, deal_manager: DealManager): void {
  flow_engine.register_handler("deal_create", async (event, context) => {
    const deal = await deal_manager.create_deal(context.user_id);

    return {
      on_exit: {
        edit_message_id: event.delete_id,
      },
      on_enter: {
        text: await deal_manager.get_info(deal.id),
        inline_keyboard: [
          [
            { text: "Выбрать метод оплаты", callback_data: `callback_deal_menu_methods:${deal.id}` },
            { text: "Ввести сумму", callback_data: `callback_deal_amount:${deal.id}` },
          ],
          [{ text: "Подтвердить", callback_data: `callback_deal_sented:${deal.id}` }],
        ],
        post: async ({ message_id }) => {
          await deal_manager.set_client_messages(deal.id, [message_id]);
        },
      },
    };
  });

  default_logger.info("Registration deal create handlers");
}
