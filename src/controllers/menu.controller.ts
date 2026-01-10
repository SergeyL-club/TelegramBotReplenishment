import type { DefaultContext } from "../core/telegram.types";
import type { RoleService } from "../services/role.service";
import type { MethodService } from "../services/method.service";
import type { LiveMessageService } from "../services/live_message.service";
import type { UserService } from "../services/user.service";
import { menu_middleware, type MenuContext } from "../middleware/menu.middleware";
import { Composer } from "../core/telegram.composer";
import { get_app_context } from "../helpers/app_context.adapter";
import { Roles } from "../databases/role.constants";
import { MethodsModifyUI } from "../ui/methods_modify.ui";
import { role_middleware } from "../middleware/role.middleware";
import { AdminReadyUI } from "../ui/admin_ready.ui";
import { TraderReadyUI } from "../ui/trader_ready.ui";

export function admin_methods_modify_menu<Type extends DefaultContext>(
  role_service: RoleService,
  live_message_service: LiveMessageService,
  method_service: MethodService
): ReturnType<Composer<Type & MenuContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer
    .use(role_middleware(role_service, Roles.ADMIN))
    .use(menu_middleware("Методы оплаты"))
    .handler(async (ctx) => {
      const app = get_app_context(ctx);
      if (!app) return;

      const methods = await method_service.get_method_names();

      const methods_modify_menu = MethodsModifyUI.main_menu(methods);
      const is = await ctx.reply(methods_modify_menu.text, methods_modify_menu.extra);

      const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
      await live_message_service.registration(
        "edited",
        "methods_menu",
        { chat_id: is.chat.id, message_id: is.message_id },
        {
          reply_methods: ["methods_modify_reply"],
          old_text: is.text,
          expired_at: expired,
        }
      );
    });
}

export function admin_ready_menu<Type extends DefaultContext>(
  role_service: RoleService,
  user_serivce: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & MenuContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer
    .use(role_middleware(role_service, Roles.ADMIN))
    .use(menu_middleware("Режим Уведомлений"))
    .handler(async (ctx) => {
      const app = get_app_context(ctx);
      if (!app) return;

      const ready = await user_serivce.admin_ready(app.user_id);

      const admin_ready_menu = AdminReadyUI.main_menu(ready);
      const is = await ctx.reply(admin_ready_menu.text, admin_ready_menu.extra);

      const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
      await live_message_service.registration(
        "edited",
        "admin_ready_menu",
        { chat_id: is.chat.id, message_id: is.message_id },
        {
          old_text: is.text,
          expired_at: expired,
        }
      );
    });
}

export function trader_ready_menu<Type extends DefaultContext>(
  role_service: RoleService,
  user_serivce: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & MenuContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer
    .use(role_middleware(role_service, Roles.TRADER))
    .use(menu_middleware("Режим Сделок"))
    .handler(async (ctx) => {
      const app = get_app_context(ctx);
      if (!app) return;

      const ready = await user_serivce.trader_ready(app.user_id);

      const trader_ready_menu = TraderReadyUI.main_menu(ready);
      const is = await ctx.reply(trader_ready_menu.text, trader_ready_menu.extra);

      const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
      await live_message_service.registration(
        "edited",
        "trader_ready_menu",
        { chat_id: is.chat.id, message_id: is.message_id },
        {
          old_text: is.text,
          expired_at: expired,
        }
      );
    });
}
