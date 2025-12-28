import { Telegraf, type Context } from "telegraf";
import type { Update } from "telegraf/typings/core/types/typegram";

export type DefaultContext = Context<Update>;
