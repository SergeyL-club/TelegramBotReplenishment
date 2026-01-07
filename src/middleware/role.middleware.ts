import type { Middleware } from "../core/telegram.composer";
import type { DefaultContext } from "../core/telegram.types";
import { Roles } from "../databases/role.constants";
import { RoleService } from "../services/role.service";

export function role_middleware<Type extends DefaultContext>(
  role_service: RoleService,
  role_name: keyof typeof Roles
): Middleware<Type, Pick<Type, never>> {
  return async (ctx) => {
    const from = ctx.update.callback_query?.from ?? ctx.update.message?.from ?? ctx.from;
    if (!from) return;
    const roles = await role_service.get_roles(from.id);
    if (roles === null) return;
    if (!roles.includes(role_name)) return;
    return {} as Type;
  };
}
