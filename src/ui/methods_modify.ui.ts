import type { DefaultContext } from "../core/telegram.types";

export const MethodsModifyUI = {
  main_menu(methods: string[]): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: `Список методов оплаты: ${methods.length > 0 ? methods.join(", ") : "Пусто"}`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Добавить метод", callback_data: "methods_modify:add" },
              { text: "Удалить метод", callback_data: "methods_modify:del" },
            ],
          ],
        },
      },
    };
  },

  reply_method_modify(): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: "Напишите название метода оплаты",
      extra: {
        reply_markup: {
          force_reply: true,
        },
      },
    };
  },
};
