import type { LiveMessageService } from "../services/live_message.service";
import type { UserService } from "../services/user.service";

const timeout_edited_keys = ["methods_menu", "methods_modify_reply", "admin_ready_menu", "trader_ready_menu"];
const timeout_replys_keys = ["methods_modify_reply"];

export async function timeout_live_message(user_serivce: UserService, live_message_service: LiveMessageService) {
  const user_ids = await user_serivce.users();

  for (const user_id of user_ids) {
    await live_message_service.cleanupExpiredKeys(user_id, timeout_edited_keys);
    await live_message_service.cleanupExpiredKeys(user_id, timeout_replys_keys, true);
  }
}
