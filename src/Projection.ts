import { EsEvent } from "./EventStore"

interface ProjectionDef {
    domainIds: Array<Record<string, string>>
    state: any
    eventHandlers: EsEvent
}

type ProjectionEventsObject<Def extends ProjectionDef> = {
    [E in Def["eventHandlers"] as E["type"]]: (state: Def["state"], event: E) => Def["state"] | Promise<Def["state"]>
}

export type Projection<Def extends ProjectionDef> = {
    domainIds: Def["domainIds"]
    init: Def["state"]
    when: ProjectionEventsObject<Def>
}
