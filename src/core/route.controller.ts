import type { TelegramAdapter, telegram_payload } from "./telegram.adapter";
import type { EventAdapter, DomainEvent } from "./event.adapter";
import type { FlowEngine } from "./flow.engine";
import type { UIAdapter } from "./ui_adapter";

export class RouteController {
  constructor(
    private readonly telegram: TelegramAdapter,
    private readonly event_adapter: EventAdapter,
    private readonly flow_engine: FlowEngine,
    private readonly ui_adapter: UIAdapter
  ) {}

  public start(): void {
    // Подписка на TelegramAdapter
    this.telegram.on_message(this.handle_telegram_payload.bind(this));
    this.telegram.on_callback(this.handle_telegram_payload.bind(this));
    this.telegram.on_reply(this.handle_telegram_payload.bind(this));
    this.telegram.on_command(this.handle_telegram_payload.bind(this));
    this.telegram.on_start(this.handle_telegram_payload.bind(this));
  }

  private async handle_telegram_payload(payload: telegram_payload): Promise<void> {
    // Преобразуем payload в domain_event
    const event: DomainEvent = await this.event_adapter.handle(payload);

    // Диспатчим событие в FlowEngine
    const result = await this.flow_engine.dispatch(payload.ctx.from!.id, event);

    // FlowEngine возвращает инструкции onEnter / onExit для UI
    if (result?.on_enter) {
      await this.ui_adapter.render(payload.ctx, result.on_enter);
    }
    if (result?.on_exit) {
      await this.ui_adapter.cleanup(payload.ctx, result.on_exit);
    }
  }
}
