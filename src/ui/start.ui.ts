import { DefaultContext } from "../core/telegram.types";
import { fragmentation_menu, Roles } from "../databases/role.constants";
import { MenuService } from "../services/menu.service";

export const StartUI = {
  main_menu(roles: (keyof typeof Roles)[]): { text: string; extra: Parameters<DefaultContext["reply"]>[1] } {
    return {
      text: "Обновление меню",
      extra: {
        reply_markup: {
          keyboard: fragmentation_menu(MenuService.get_menu_for_roles(roles)),
          resize_keyboard: true,
        },
      },
    };
  },
};
