import { DcbEvent, EventEnvelope, Tags } from "@dcb-es/event-store"

export interface EventHandlerWithState<
    TEvents extends DcbEvent<string, Tags, unknown, unknown>,
    TState,
    TTags extends Tags = Tags
> {
    tagFilter?: Partial<TTags>
    onlyLastEvent?: boolean
    init: TState
    when: {
        [E in TEvents as E["type"]]: (
            eventEnvelope: EventEnvelope<Extract<TEvents, { type: E["type"] }>>,
            state: TState
        ) => TState | Promise<TState>
    }
}
