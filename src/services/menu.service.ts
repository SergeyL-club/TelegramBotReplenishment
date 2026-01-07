import { type MenuButton, menus, Roles } from "../databases/role.constants";

export class MenuService {
  public static get_menu_for_roles(roles: (keyof typeof Roles)[]): MenuButton[] {
    const result: MenuButton[] = [];
    for (const role_name of roles) {
      if (menus[role_name].length > 0) result.push(...menus[role_name]);
    }
    return result;
  }
}
