import { type MenuButton, menus, Roles } from "../databases/role.constants";

export class MenuService {
  static get_menu_roles(roles: string[]): MenuButton[] {
    const pre_menus: MenuButton[] = [];
    const keys = Object.keys(menus) as (keyof typeof Roles)[];
    for (const key of keys) {
      if (roles.includes(key)) pre_menus.push(...menus[key]);
    }
    return pre_menus;
  }
}
