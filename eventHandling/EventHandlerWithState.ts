import { EsEvent, EsEventEnvelope } from "../eventStore/EventStore"

interface EsEventHandlerWithStateDef {
    state: unknown
    eventHandlers: EsEvent
}

type EventHandlerWithStateFn<TEvent, TState> = (eventEnvelope: TEvent, state: TState) => TState | Promise<TState>
type EventHandlersWithState<TDef extends EsEventHandlerWithStateDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandlerWithStateFn<EsEventEnvelope<E>, TDef["state"]>
}

export interface EventHandlerWithState<TDef extends EsEventHandlerWithStateDef = EsEventHandlerWithStateDef> {
    tagFilter?: Partial<Record<keyof TDef["eventHandlers"]["tags"], string | string[]>>
    init?: TDef["state"]
    when: EventHandlersWithState<TDef>
}
