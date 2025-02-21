import { DcbEvent, EventEnvelope } from "../eventStore/EventStore"
import { Tags } from "../eventStore/Tags"

export interface EventHandler<TEvents extends DcbEvent<string, Tags, unknown, unknown>, TTags extends Tags = Tags> {
    tagFilter?: Partial<TTags>
    onlyLastEvent?: boolean
    when: {
        [E in TEvents as E["type"]]: (
            eventEnvelope: EventEnvelope<Extract<TEvents, { type: E["type"] }>>
        ) => void | Promise<void>
    }
}
