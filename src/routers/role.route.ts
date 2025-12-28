import type { TelegramAdapter } from "../core/telegram.adapter";
import type { UserContextAdapter } from "../databases/user.context";
import { RoleController } from "../controllers/role.controller";

export function use_start_role(telegram_adapter: TelegramAdapter, user_context: UserContextAdapter): void {
  telegram_adapter.registration_composer(RoleController.start_registration_role(user_context));
}
