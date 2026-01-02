import type { UserContext } from "../middleware/user.middleware";
import type { UserContextAdapter } from "../databases/user.context";
import type { Middleware } from "../core/telegram.composer";
import { Command, commands, fragmentation_menu, type MenuButton, menus, type Roles } from "../databases/role.constants";

export type RoleContext = {
  user: {
    roles: string[];
  };
};

export class RoleService {
  static async registration_role(user_context: UserContextAdapter, role_name: string, ctx: UserContext): Promise<void> {
    await user_context.set(ctx.user.id, { roles: [role_name] });
  }

  static modify_user_middleware<Type extends UserContext>(user_context: UserContextAdapter): Middleware<Type, RoleContext> {
    return async (ctx) => {
      const context = "roles" in ctx.user ? ctx.user : await user_context.get<{ roles: string[] }>(ctx.user.id);
      if (!context || typeof context !== "object" || !("roles" in context)) return;
      if (!Array.isArray(context.roles)) return;
      return { user: { roles: context.roles } };
    };
  }

  static async get_menu_command(user_context: UserContextAdapter, user_id: number): Promise<string[][]> {
    const data = await user_context.get<RoleContext["user"]>(user_id);
    if (!data || typeof data !== "object") return [[]] as string[][];
    const { roles } = data;
    if (!roles || !Array.isArray(roles)) return [[]] as string[][];
    const pre_menu: MenuButton[] = [];
    const keys = Object.keys(menus) as (keyof typeof Roles)[];
    for (const key of keys) {
      if (roles.includes(key)) pre_menu.push(...menus[key]);
    }
    return fragmentation_menu(pre_menu);
  }

  static async get_command(user_context: UserContextAdapter, user_id: number) {
    const data = await user_context.get<RoleContext["user"]>(user_id);
    if (!data || typeof data !== "object") return [] as Command[];
    const { roles } = data;
    if (!roles || !Array.isArray(roles)) return [] as Command[];
    const pre_commands: Command[] = [];
    const keys = Object.keys(commands) as (keyof typeof Roles)[];
    for (const key of keys) {
      if (roles.includes(key)) pre_commands.push(...commands[key]);
    }

    return pre_commands;
  }

  // TODO: дополнить ещё check_role чтобы можно было в middleware записать название роли и только те кто имеет её могли пройти дальше
}
