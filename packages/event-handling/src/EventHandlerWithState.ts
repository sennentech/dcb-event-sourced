import { DcbEvent, EventEnvelope, Tags } from "@dcb-es/event-store"

// interface EventHandlerWithStateDef {
//     state: unknown
//     eventHandlers: DcbEvent
// }

// type EventHandlerWithStateFn<TEventEnvelope extends EventEnvelope<DcbEvent>, TState> = (
//     eventEnvelope: TEventEnvelope,
//     state: TState
// ) => TState | Promise<TState>

// type EventHandlersWithState<TDef extends EventHandlerWithStateDef> = {
//     [E in TDef["eventHandlers"]as E["type"]]: EventHandlerWithStateFn<EventEnvelope<E>, TDef["state"]>
// }

export interface EventHandlerWithState<TEvents extends DcbEvent<string, Tags, unknown, unknown>, TState> {
    tagFilter?: Partial<Tags>
    onlyLastEvent?: boolean
    init: TState
    when: {
        [K in TEvents["type"]]: (
            eventEnvelope: EventEnvelope<Extract<TEvents, { type: K }>>,
            state: TState
        ) => TState | Promise<TState>
    }
}
