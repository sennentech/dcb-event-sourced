import { StoredEsEvent, Tags } from "../eventStore/EventStore"

export interface ProjectionDef {
    tags: Tags
    state: any
    eventHandlers: StoredEsEvent
}

type ProjectionEventsObject<Def extends ProjectionDef> = {
    [E in Def["eventHandlers"] as E["type"]]: (state: Def["state"], event: E) => Def["state"] | Promise<Def["state"]>
}

export type Projection<Def extends ProjectionDef> = {
    tags: Def["tags"]
    init: Def["state"]
    when: ProjectionEventsObject<Def>
}
