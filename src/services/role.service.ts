import type { UserContext } from "../middleware/user.middleware";
import type { UserContextAdapter } from "../databases/user.context";
import type { Middleware } from "../core/telegram.composer";
import type { RoleDatabaseAdapter } from "../databases/role.database";

export type RoleContext = {
  user: {
    roles: string[];
  };
};

export class RoleService {
  static async registration_role(
    role_database: RoleDatabaseAdapter,
    user_context: UserContextAdapter,
    role_name: string,
    ctx: UserContext
  ): Promise<void> {
    await user_context.set(ctx.user.id, { roles: [role_name] });
    await role_database.add(role_name);
  }

  static modify_user_middleware<Type extends UserContext>(user_context: UserContextAdapter): Middleware<Type, RoleContext> {
    return async (ctx) => {
      const context = "roles" in ctx.user ? ctx.user : await user_context.get<{ roles: string[] }>(ctx.user.id);
      if (!context || typeof context !== "object" || !("roles" in context)) return;
      if (!Array.isArray(context.roles)) return;
      return { user: { roles: context.roles } };
    };
  }
}
