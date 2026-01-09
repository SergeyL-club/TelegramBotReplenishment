import type { LiveMessageService } from "../services/live_message.service";

export async function timeout_live_message(live_message_service: LiveMessageService) {
  await live_message_service.cleanupExpiredKeys("edited");
  await live_message_service.cleanupExpiredKeys("replys");
}
