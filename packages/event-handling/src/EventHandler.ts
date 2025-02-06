import { DcbEvent, EventEnvelope, Tags } from "@dcb-es/event-store"

interface EventHandlerDef {
    tagFilter?: Tags
    eventHandlers: DcbEvent
}

type EventHandlerFn<TEvent> = (eventEnvelope: TEvent) => void | Promise<void>
type EventHandlers<TDef extends EventHandlerDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandlerFn<EventEnvelope<E>>
}

export interface EventHandler<TDef extends EventHandlerDef = EventHandlerDef> {
    when: EventHandlers<TDef>
    onlyLastEvent?: boolean
}
