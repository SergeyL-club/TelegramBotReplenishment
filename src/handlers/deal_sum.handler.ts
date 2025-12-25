import type { FlowEngine } from "../core/flow.engine";
import { default_logger } from "../core/logger";

export function use_deal_sum_handler(flow_engine: FlowEngine): void {
  flow_engine.register_handler("callback_menu_reply_deal_sum", async (event, context) => {
    const sum_id = (context as any)["pre_deals"][event.pre_deal_id]["sum_id"] as number | undefined;
    console.log("sum_id:", sum_id);
    const delete_ids = sum_id ? [sum_id] : [];
    return {
      on_exit: delete_ids.map((id) => ({ edit_message_id: id })),
      on_enter: {
        answerCB: true,
        text: "Напишите сумму оплаты",
        force_reply: true,
        bind_id: true,
        bind_data: { edit_id: event.edit_id, pre_deal_id: event.pre_deal_id },
        modify_context: true,
        context: { bind_id: ["pre_deals", event.pre_deal_id, "sum_id"], data: {} },
      },
    };
  });

  flow_engine.register_handler("open_reply_deal_sum", async (event, context) => {
    const sum = Number(event.text);
    if (Number.isNaN(sum))
      return {
        on_exit: event.delete_ids.map((id) => ({ edit_message_id: id })),
        on_enter: {
          text: `Некорректная сумма ${sum} (${event.text}), ответьте заново на это сообщение правильной суммой`,
          force_reply: true,
          bind_data: { edit_id: event.edit_id, pre_deal_id: event.pre_deal_id },
        },
      };

    const pre_deals = (context as any)["pre_deals"] as { [key: number]: { method_name: string; sum?: number } };
    const pre_deal_data = pre_deals[event.pre_deal_id]!;
    pre_deals[event.pre_deal_id] = { method_name: pre_deal_data.method_name, sum: sum };
    return {
      on_exit: event.delete_ids.map((id) => ({ edit_message_id: id })),
      on_enter: [
        {
          edit_message_id: event.edit_id,
          text: `Выбран метод оплаты ${pre_deals[event.pre_deal_id]?.method_name} и суммой оплаты ${pre_deals[event.pre_deal_id]?.sum}`,
          modify_context: true,
          context: {
            strict: true,
            data: { pre_deals: pre_deals },
          },
        },
      ],
    };
  });

  default_logger.info("Registration deal method handlers");
}
