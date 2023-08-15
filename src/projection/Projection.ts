import { EsEvent, EsEventEnvelope, Tags } from "../eventStore/EventStore"

export interface ProjectionDef {
    tagFilter?: Tags
    state: unknown
    eventHandlers: EsEvent
}

type ProjectionEventsObject<TDef extends ProjectionDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: (
        eventEnvelope: EsEventEnvelope<E>,
        state: TDef["state"]
    ) => TDef["state"] | Promise<TDef["state"]>
}

export interface Projection<TDef extends ProjectionDef = ProjectionDef> {
    tagFilter?: TDef["tagFilter"]
    init?: TDef["state"]
    when: ProjectionEventsObject<TDef>
}

export interface PartitionedStateManager<TState> {
    read: (partitionKey: string) => Promise<TState>
    save: (partitionKey: string, state: TState) => Promise<void>
}

export interface UnpartionedStateManager<TState> {
    read: () => Promise<TState>
    save: (state: TState) => Promise<void>
}

export interface PersistentProjection<TDef extends ProjectionDef = ProjectionDef> extends Projection<TDef> {
    stateManager: UnpartionedStateManager<TDef["state"]>
}

export interface PartitionedPersistentProjection<TDef extends ProjectionDef = ProjectionDef> extends Projection<TDef> {
    partitionByTags: (tags: TDef["eventHandlers"]["tags"]) => string
    stateManager: PartitionedStateManager<TDef["state"]>
}
