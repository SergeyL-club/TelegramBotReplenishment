import type { DefaultContext } from "../core/telegram.types";

export const AdminReadyUI = {
  main_menu(ready: boolean): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: `Режим уведомлений заявок: ${ready ? "Включен" : "Выключен"}`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Включить", callback_data: "admin_ready:add" },
              { text: "Выключить", callback_data: "admin_ready:del" },
            ],
          ],
        },
      },
    };
  },
};
