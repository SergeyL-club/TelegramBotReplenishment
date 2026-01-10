import type { DefaultContext } from "../core/telegram.types";
import type { DealData, AllNotify } from "../databases/deal.database";
import type { UserService } from "../services/user.service";

export function formating_history(history: AllNotify[]): string {
  let text = "";
  for (const el of history)
    switch (el) {
      default:
        text += `[${new Date(el.at).toISOString()}] ${JSON.stringify(el, undefined, 0)}\n`;
    }
  return text;
}

export const DealAdminUI = {
  async deal_info(deal: DealData, user_service: UserService): Promise<{ text: string; extra: Parameters<DefaultContext["reply"]>[1] }> {
    const client = await user_service.get_user(deal.client_id);
    const trader = deal.trader_id ? await user_service.get_user(deal.trader_id) : null;
    return {
      text: `Заявка #${deal.id}
      Метода оплаты: ${deal.method_name ? deal.method_name : "Не задан"}
      Сумма: ${deal.amount ? deal.amount : "Не задана"}
      Реквизиты: ${deal.details ? deal.details : "Не заданы"}
      Клиент: ${client!.username ?? client!.user_id}
      Продавец: ${trader ? (trader.username ?? trader.user_id) : "Не задан"}
      ---История---
      ${formating_history(deal.history)}`,
      extra: {},
    };
  },
};
