import type { DefaultContext } from "../core/telegram.types";
import { fragmentation_menu, Roles } from "../databases/role.constants";
import { MenuService } from "../services/menu.service";

export const CodeUI = {
  invalid_token(token?: string) {
    return { text: `Неверный токен (${token ?? "—"})` };
  },

  main_menu(roles: (keyof typeof Roles)[]): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: "Обновление Меню",
      extra: {
        reply_markup: {
          keyboard: fragmentation_menu(MenuService.get_menu_for_roles(roles)),
          resize_keyboard: true,
        },
      },
    };
  },
};
