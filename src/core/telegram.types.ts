import type { Context } from "telegraf";
import type { Update } from "telegraf/typings/core/types/typegram";

type FromChat = {
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    type: string;
  };
};

type MessageBase = {
  message_id: number;
  date: number;
  text: string;
  entities?: { offset: number; length: number; type: string }[];
} & FromChat;

export interface ContextMiddleware {
  update: {
    update_id: number;
    message?: MessageBase & { reply_to_message?: MessageBase };
    callback_query?: {
      id: string;
      chat_instance: string;
      data: string;
    } & FromChat;
  };
}

export type DefaultContext = ContextMiddleware & Context<Update>;
