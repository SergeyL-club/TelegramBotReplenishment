import type { FlowEngine } from "../core/flow.engine";
import { default_logger } from "../core/logger";

export function use_deal_method_handler(flow_engine: FlowEngine): void {
  flow_engine.register_handler("open_deal_menu_methods", async (event) => {
    return {
      on_exit: {
        edit_message_id: event.deal_id,
      },
      on_enter: {
        text: "Выберите метод оплаты:",
        inline_keyboard: [
          [
            { text: "test1", callback_data: "callback_deal_menu_methods:test1" },
            { text: "test2", callback_data: "callback_deal_menu_methods:test2" },
          ],
        ],
      },
    };
  });

  flow_engine.register_handler("callback_deal_menu_methods", async (event, context) => {
    let id = 0;
    if ("pre_deals" in context)
      while ((context as any)["pre_deals"][id]) {
        ++id;
      }
    const pre_deals = ("pre_deals" in context ? { ...(context as any)["pre_deals"] } : {}) as Record<string, { method_name: string }>;
    pre_deals[id] = { method_name: event.method_name };
    return {
      on_enter: [
        {
          answerCB: true,
          edit_message_id: event.edit_id,
          text: `Выбран метод оплаты ${event.method_name}`,
        },
        {
          context: {
            data: { pre_deals },
          },
        },
      ],
    };
  });

  default_logger.info("Registration deal method handlers");
}
