import type { UserContextAdapter } from "../databases/user.context";
import type { Middleware } from "../core/telegram.composer";
import { role_codes, type Roles } from "../databases/role.constants";
import { DefaultContext } from "../core/telegram.types";

export type RoleContext = {
  user: {
    roles: string[];
  };
};

export class RoleService {
  static async registration_role(user_context: UserContextAdapter, role_name: string, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id !== "number") return;
    await user_context.set(user_id, { roles: [role_name] });
  }

  static async get_roles(user_context: UserContextAdapter, ctx: DefaultContext): Promise<string[] | null> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id !== "number") return null;
    const data = await user_context.get<{ roles: string[] }>(user_id);
    if (typeof data !== "object" || data === null || !("roles" in data)) return null;
    if (!Array.isArray(data.roles)) return null;
    return data.roles;
  }

  static verification_token(token: string): string | null {
    const keys = Object.keys(role_codes) as (keyof typeof Roles)[];
    let role: string | null = null;
    for (const key of keys) {
      if (role_codes[key] === token) {
        role = key;
        break;
      }
    }
    return role;
  }

  static modify_user_middleware<Type extends DefaultContext>(user_context: UserContextAdapter): Middleware<Type, RoleContext> {
    return async (ctx) => {
      const user_id = ctx.update.callback_query
        ? ctx.update.callback_query.from.id
        : ctx.update.message
          ? ctx.update.message.from.id
          : ctx.from?.id;
      if (typeof user_id !== "number") return;
      const context = await user_context.get<{ roles: string[] }>(user_id);
      if (!context || typeof context !== "object" || !("roles" in context)) return;
      if (!Array.isArray(context.roles)) return;
      return { user: { roles: context.roles } };
    };
  }

  // TODO: дополнить ещё check_role чтобы можно было в middleware записать название роли и только те кто имеет её могли пройти дальше
}
