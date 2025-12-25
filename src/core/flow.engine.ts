import type { DomainBase, DomainEvent } from "./event.adapter";
import type { ContextStorageAdapter } from "./user_storage.adapter";
import type { UIInstruction } from "./ui.adapter";

type ReturnUIInstruction = { on_enter?: UIInstruction | UIInstruction[]; on_exit?: UIInstruction | UIInstruction[] };

export type ContextBase = { user_id: number; chat_id: number };
export type ContextBind = { bind: (context: Record<string, unknown> & ContextBase) => Promise<void> };

export type FlowHandler<E extends DomainEvent = DomainEvent> = (
  event: Omit<E, keyof DomainBase>,
  context: Record<string, unknown> & ContextBase
) => Promise<void> | void | Promise<ReturnUIInstruction> | ReturnUIInstruction;

export class FlowEngine {
  private handlers: Map<string, FlowHandler> = new Map();

  public constructor(private readonly context_adapter: ContextStorageAdapter) {}

  public register_handler<EventType extends DomainEvent["type"]>(
    event_type: EventType,
    handler: FlowHandler<Extract<DomainEvent, { type: EventType }>>
  ): void {
    this.handlers.set(event_type, handler as FlowHandler);
  }

  public async dispatch(user_id: number, event: DomainEvent): Promise<void | ReturnUIInstruction | null> {
    const context = { user_id: event.user_id, chat_id: event.chat_id, ...((await this.context_adapter.get(user_id)) ?? {}) };
    const handler = this.handlers.get(event.type);

    let result = null;
    if (handler) {
      result = await handler(event, context as Record<string, unknown> & ContextBase);
      await this.context_adapter.set(user_id, context);
    }

    return result;
  }

  public async get_user_context(user_id: number): Promise<Record<string, unknown> | null> {
    return await this.context_adapter.get(user_id);
  }

  public async reset_user_context(user_id: number): Promise<void> {
    await this.context_adapter.set(user_id, {});
  }
}
