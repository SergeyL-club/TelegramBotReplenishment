import type { DefaultContext } from "../core/telegram.types";
import type { UserService } from "../services/user.service";
import type { RoleService } from "../services/role.service";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { get_app_context } from "../helpers/app_context.adapter";
import { CommandService } from "../services/command.service";
import { Composer } from "../core/telegram.composer";
import { Roles } from "../databases/role.constants";
import { StartUI } from "../ui/start.ui";

export function start_registration_role<Type extends DefaultContext>(
  user_service: UserService,
  role_service: RoleService,
): ReturnType<Composer<Type & StartContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(start_middleware()).handler(async (ctx) => {
    const app = get_app_context(ctx);
    if (!app) return;

    await role_service.ensure_role(app.user_id, Roles.CLIENT);
    await user_service.save_user(app);

    const roles = await role_service.get_roles(app.user_id);

    await CommandService.apply_for_chat(ctx, app.chat_id, roles);

    const reply = StartUI.main_menu(roles);
    await ctx.reply(reply.text, reply.extra);
  });
}
