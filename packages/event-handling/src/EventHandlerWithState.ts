import { DcbEvent, EventEnvelope } from "@dcb-es/event-store"

interface EventHandlerWithStateDef {
    state: unknown
    eventHandlers: DcbEvent
}

type EventHandlerWithStateFn<TEvent, TState> = (eventEnvelope: TEvent, state: TState) => TState | Promise<TState>
type EventHandlersWithState<TDef extends EventHandlerWithStateDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandlerWithStateFn<EventEnvelope<E>, TDef["state"]>
}

export interface EventHandlerWithState<TDef extends EventHandlerWithStateDef = EventHandlerWithStateDef> {
    tagFilter?: Partial<Record<keyof TDef["eventHandlers"]["tags"], string | string[]>>
    onlyLastEvent?: boolean
    init?: TDef["state"]
    when: EventHandlersWithState<TDef>
}
