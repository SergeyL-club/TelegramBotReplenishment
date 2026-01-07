import type { DefaultContext } from "../core/telegram.types";

export const TraderReadyUI = {
  main_menu(ready: boolean): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: `Режим заявок: ${ready ? "Включен" : "Выключен"}`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Включить", callback_data: "trader_ready:add" },
              { text: "Выключить", callback_data: "trader_ready:del" },
            ],
          ],
        },
      },
    };
  },
};
