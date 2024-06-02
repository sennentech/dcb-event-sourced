import { EsEvent, EsEventEnvelope, Tags } from "@dcb-es/event-store"

interface EsEventHandlerDef {
    tagFilter?: Tags
    eventHandlers: EsEvent
}

type EventHandlerFn<TEvent> = (eventEnvelope: TEvent) => void | Promise<void>
type EventHandlers<TDef extends EsEventHandlerDef> = {
    [E in TDef["eventHandlers"] as E["type"]]: EventHandlerFn<EsEventEnvelope<E>>
}

export interface EventHandler<TDef extends EsEventHandlerDef = EsEventHandlerDef> {
    when: EventHandlers<TDef>
    onlyLastEvent?: boolean
}
