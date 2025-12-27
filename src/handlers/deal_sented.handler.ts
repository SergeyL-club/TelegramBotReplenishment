import type { FlowEngine } from "../core/flow.engine";
import type { DealManager } from "../database/deal_manager";
import { default_logger } from "../core/logger";

export function use_deal_sented_handler(flow_engine: FlowEngine, deal_manager: DealManager): void {
  flow_engine.register_handler("callback_deal_sented", async (event) => {
    const update_ids = await deal_manager.get_deal_client_messages(event.deal_id);

    await deal_manager.set_sented(event.deal_id, Date.now());

    const deal = await deal_manager.get_deal(event.deal_id);
    const info = await deal_manager.get_info(event.deal_id);

    const trader_ids: number[] = [974047084];
    const error = !deal!.amount ? "Нет Суммы" : !deal!.method_name ? "Нет Метода Оплаты" : trader_ids.length <= 0 ? "Нет Систем" : null;
    if (error)
      return {
        on_enter: [
          ...update_ids.map((edit_message_id) => ({
            edit_message_id,
            text: info,
            inline_keyboard: [
              error !== "Нет Систем"
                ? [
                    { text: "Выбрать метод оплаты", callback_data: `callback_deal_menu_methods:${event.deal_id}` },
                    { text: "Ввести сумму", callback_data: `callback_deal_amount:${event.deal_id}` },
                  ]
                : [],
              [{ text: `[${error}] Повторно подтвердить`, callback_data: `callback_deal_sented:${event.deal_id}` }],
            ],
          })),
          { answerCB: true },
        ],
      };

    const delete_ids = await deal_manager.get_deal_traders_messages(event.deal_id);
    await deal_manager.reset_traders_messages(event.deal_id);

    return {
      on_exit: delete_ids.map((edit_message_id) => ({ edit_message_id })),
      on_enter: [
        ...update_ids.map((edit_message_id) => ({
          edit_message_id,
          text: info,
          inline_keyboard: [[{ text: "[На Рассмотрении] Повторно подтвердить", callback_data: `callback_deal_sented:${event.deal_id}` }]],
        })),
        ...trader_ids.map((user_id) => ({
          user_id,
          text: info,
          inline_keyboard: [[{ text: "Принять", callback_data: `callback_deal_details:${event.deal_id}` }]],
          post: async (data: { message_id: number; context: any }) => {
            await deal_manager.set_traders_messages(event.deal_id, [data.message_id]);
          },
        })),
        { answerCB: true },
      ],
    };
  });

  default_logger.info("Registration deal sented handlers");
}
