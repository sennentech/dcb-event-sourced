import { EsEvent, EsEventEnvelope } from "../eventStore/EventStore"

interface EsEventListenerDef {
    state: unknown
    eventHandlers: EsEvent
}

type EventHandler<TEvent, TState> = (eventEnvelope: TEvent, state: TState) => TState | Promise<TState>
type EventHandlers<TDef extends EsEventListenerDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandler<EsEventEnvelope<E>, TDef["state"]>
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

export interface EsEventListener<TDef extends EsEventListenerDef = EsEventListenerDef> {
    tagFilter?: Partial<Record<keyof TDef["eventHandlers"]["tags"], string>>
    init?: TDef["state"]
    when: EventHandlers<TDef>
}

export interface PersistentStateEventListener<TDef extends EsEventListenerDef = EsEventListenerDef>
    extends EsEventListener<TDef> {
    stateManager: UnpartionedStateManager<TDef["state"]>
}

export interface PartitionedStateEventListener<TDef extends EsEventListenerDef = EsEventListenerDef>
    extends EsEventListener<TDef> {
    partitionByTags: (tags: TDef["eventHandlers"]["tags"]) => string
    stateManager: PartitionedStateManager<TDef["state"]>
}
