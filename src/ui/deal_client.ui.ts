import type { DefaultContext } from "../core/telegram.types";
import type { DealData } from "../databases/deal.database";

export const DealClientUI = {
  add_pre_deal_info(deal: DealData): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: `Заявка #${deal.id}
      Метода оплаты: ${deal.method_name ? deal.method_name : "Не задан"}
      Сумма: ${deal.amount ? deal.amount : "Не задана"}
      Реквизиты: ${deal.details ? deal.details : "Не заданы"}`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Выбрать метод оплаты", callback_data: `add_method_name:${deal.id}` },
              { text: "Задать сумму", callback_data: `add_amount:${deal.id}` },
            ],
            [{ text: "Отправить на рассмотрение", callback_data: `notify_trader:${deal.id}` }],
          ],
        },
      },
    };
  },
};
