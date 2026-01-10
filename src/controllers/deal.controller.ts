import type { LiveMessageService } from "../services/live_message.service";
import type { DefaultContext } from "../core/telegram.types";
import type { UserService } from "../services/user.service";
import type { DealService } from "../services/deal.service";
import { Composer } from "../core/telegram.composer";
import { menu_middleware, type MenuContext } from "../middleware/menu.middleware";
import { DealClientUI } from "../ui/deal_client.ui";
import { DealAdminUI } from "../ui/deal_admin.ut";
import { get_app_context } from "../helpers/app_context.adapter";

export function registration_deal<Type extends DefaultContext>(
  deal_service: DealService,
  user_service: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & MenuContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(menu_middleware("Пополнение")).handler(async (ctx) => {
    const app = get_app_context(ctx);
    if (!app) return;

    const deal_id = await deal_service.registration_deal(app.user_id);
    const deal = (await deal_service.get_deal(deal_id))!;
    const deal_menu = DealClientUI.add_pre_deal_info(deal);

    const is = await ctx.reply(deal_menu.text, deal_menu.extra);
    const expired = Math.ceil(Date.now() / 1000) + 1 * 60 * 60;
    await live_message_service.registration(
      "edited",
      `deal_info:${deal_id}`,
      { chat_id: is.chat.id, message_id: is.message_id },
      {
        type: "client_info",
        old_text: is.text,
        expired_at: expired,
      }
    );

    const admins = await user_service.all_admin_ready();
    for (const admin_id of admins) {
      const user_data = await user_service.get_user(admin_id);
      if (!user_data) continue;
      const deal_info = await DealAdminUI.deal_info(deal, user_service);
      const is = await ctx.telegram.sendMessage(user_data.chat_id, deal_info.text, deal_info.extra);
      await live_message_service.registration(
        "edited",
        `deal_info:${deal_id}`,
        { chat_id: is.chat.id, message_id: is.message_id },
        {
          type: "admin_info",
          old_text: is.text,
          expired_at: expired,
        }
      );
    }
  });
}

export { deal_amount_callback, deal_amount_reply } from "./deal_pre.controller";
