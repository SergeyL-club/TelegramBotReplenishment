import type { Middleware } from "../core/telegram.composer";
import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import { RoleService } from "../services/role.service";

export function role_middleware<Type extends DefaultContext>(
  user_context: UserContextAdapter,
  role_name: string
): Middleware<Type, Pick<Type, never>> {
  return async (ctx) => {
    const roles = await RoleService.get_roles(user_context, ctx);
    if (roles === null) return;
    if (!roles.includes(role_name)) return;
    return {} as Type;
  };
}
