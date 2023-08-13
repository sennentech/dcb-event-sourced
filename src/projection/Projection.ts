import { EsEvent, EsEventEnvelope, Tags } from "../eventStore/EventStore"

export interface ProjectionDef {
    tags: Tags
    state: unknown
    eventHandlers: EsEvent
}

type ProjectionEventsObject<Def extends ProjectionDef> = {
    [E in Def["eventHandlers"] as E["type"]]: (
        state: Def["state"],
        eventEnvelope: EsEventEnvelope<E>
    ) => Def["state"] | Promise<Def["state"]>
}

export type Projection<Def extends ProjectionDef = ProjectionDef> = {
    tags: Def["tags"]
    init: Def["state"]
    when: ProjectionEventsObject<Def>
}
