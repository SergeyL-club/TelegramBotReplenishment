import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import { default_logger } from "../core/logger";
import {
  Roles,
  type RolesKeys,
  type RolesValue,
  client_commands,
  command_roles,
  fragmentation_menu,
  menu_roles,
} from "../database/role_globals";

const tokens = Object.keys(Roles).reduce(
  (acc, key) => {
    acc[key] = process.env[`${key}_TOKEN`] ?? null;
    return acc;
  },
  {} as { [key: string]: string | null }
);

export async function use_code(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use(
    { kid: "command", math: (_, msg) => "text" in msg && msg.text.trim().split(" ")[0] === client_commands[0]?.command },
    async (ctx, msg) => {
      if (!("text" in msg)) return;
      const token = msg.text.trim().split(" ")[1];
      const user_id = msg.from!.id;
      const chat_id = msg.chat.id;

      for (const key of Object.keys(tokens)) {
        if (tokens[key] === token) {
          await user_manager.add_role_user(Roles[key as RolesKeys], user_id);
          break;
        }
      }

      await ctx.telegram.setMyCommands(command_roles(), { scope: { type: "chat", chat_id: chat_id } });
      const roles = await user_manager.role_by_user_id(user_id);
      if (!roles) return;
      await ctx.reply("Меню обновлено", {
        reply_markup: { keyboard: fragmentation_menu(menu_roles(roles as RolesValue[])), resize_keyboard: true },
      });
    }
  );

  await default_logger.log("Active tokens: ", tokens);
  await default_logger.info("Registration use_start is finish");
}
