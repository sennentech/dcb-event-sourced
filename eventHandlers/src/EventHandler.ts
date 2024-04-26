import { EsEvent, EsEventEnvelope } from "../../eventStore/src/EventStore"

interface EsEventHandlerDef {
    state: unknown
    eventHandlers: EsEvent
}

type EventHandlerFn<TEvent, TState> = (eventEnvelope: TEvent, state: TState) => TState | Promise<TState>
type EventHandlers<TDef extends EsEventHandlerDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandlerFn<EsEventEnvelope<E>, TDef["state"]>
}

export interface PartitionedStateManager<TState> {
    saveInterval?: number
    read: (partitionKey: string) => Promise<TState>
    save: (partitionKey: string, state: TState) => Promise<void>
}

export interface UnpartionedStateManager<TState> {
    saveInterval?: number
    read: () => Promise<TState>
    save: (state: TState) => Promise<void>
}

export interface EventHandler<TDef extends EsEventHandlerDef = EsEventHandlerDef> {
    tagFilter?: Partial<Record<keyof TDef["eventHandlers"]["tags"], string>>
    init?: TDef["state"]
    when: EventHandlers<TDef>
}

export interface PersistentStateEventHandler<TDef extends EsEventHandlerDef = EsEventHandlerDef>
    extends EventHandler<TDef> {
    stateManager: UnpartionedStateManager<TDef["state"]>
}

export interface PartitionedStateEventHandler<TDef extends EsEventHandlerDef = EsEventHandlerDef>
    extends EventHandler<TDef> {
    partitionByTags: (tags: TDef["eventHandlers"]["tags"]) => string
    stateManager: PartitionedStateManager<TDef["state"]>
}
