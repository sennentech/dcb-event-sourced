import { EsEvent, Tags } from "../eventStore/EventStore"
import { SequenceNumber } from "../eventStore/SequenceNumber"
import { Timestamp } from "../eventStore/TimeStamp"

export interface ProjectionDef {
    tags: Tags
    state: any
    eventHandlers: EsEvent
}

type ProjectionEventsObject<Def extends ProjectionDef> = {
    [E in Def["eventHandlers"] as E["type"]]: (
        state: Def["state"],
        eventEnvelope: { timestamp: Timestamp; sequenceNumber: SequenceNumber; event: E }
    ) => Def["state"] | Promise<Def["state"]>
}

export type Projection<Def extends ProjectionDef> = {
    tags: Def["tags"]
    init: Def["state"]
    when: ProjectionEventsObject<Def>
}
