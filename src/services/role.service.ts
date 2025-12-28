import type { UserContext } from "../middleware/user.middleware";
import type { UserContextAdapter } from "../databases/user.context";
import type { Middleware } from "../core/telegram.composer";

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
      const context = await user_context.get<{ roles: string[] }>(ctx.user.id);
      if (!context || typeof context !== "object" || !context.roles) return;
      return { user: { roles: context.roles } };
    };
  }
}
