import type { DefaultContext } from "../core/telegram.types";
import { command_middleware, type CommandContext } from "../middleware/commad.middleware";
import { get_app_context } from "../helpers/app_context.adapter";
import { CommandService } from "../services/command.service";
import { RoleService } from "../services/role.service";
import { Composer } from "../core/telegram.composer";
import { get_text } from "../helpers/text.adapter";
import { CodeUI } from "../ui/code.ui";
import { RefreshUI } from "../ui/refresh.ui";

export function code_registration_role<Type extends DefaultContext>(
  role_service: RoleService
): ReturnType<Composer<Type & CommandContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(command_middleware("/code")).handler(async (ctx) => {
    const app = get_app_context(ctx);
    if (!app) return;

    const { text } = get_text(ctx) ?? {};
    if (typeof text !== "string") return;

    const token = text.split(" ")[1];
    if (typeof token !== "string") return;

    const role = RoleService.verify_token(token);
    if (!role) {
      const code_error = CodeUI.invalid_token(token);
      await ctx.reply(code_error.text);
      return;
    }
    await role_service.ensure_role(app.user_id, role);

    const roles = await role_service.get_roles(app.user_id);

    await CommandService.apply_for_chat(ctx, app.chat_id, roles);

    const code_verify = CodeUI.main_menu(roles);
    await ctx.reply(code_verify.text, code_verify.extra);
  });
}

export function refresh_menu<Type extends DefaultContext>(
  role_service: RoleService
): ReturnType<Composer<Type & CommandContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(command_middleware("/menu")).handler(async (ctx) => {
    const app = get_app_context(ctx);
    if (!app) return;

    const roles = await role_service.get_roles(app.user_id);

    await CommandService.apply_for_chat(ctx, app.chat_id, roles);

    const refresh_ui = RefreshUI.main_menu(roles);
    await ctx.reply(refresh_ui.text, refresh_ui.extra);
  });
}
