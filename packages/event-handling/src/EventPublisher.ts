import {
    EventStore,
    DcbEvent,
    AppendCondition,
    SequenceNumber
} from "@dcb-es/event-store"
import { EventHandler } from "./EventHandler"
import { EventHandlerRegistry } from "./EventHandlerRegistry"
import { Queries, Query } from "@dcb-es/event-store"

export class EventPublisher {
    constructor(
        private eventStore: EventStore,
        private eventHandlerRegistry?: EventHandlerRegistry
    ) { }

    async publish(events: DcbEvent | DcbEvent[], appendCondition: AppendCondition): Promise<void> {
        const { eventStore, eventHandlerRegistry } = this

        await eventStore.append(events, appendCondition)
        if (!eventHandlerRegistry) return

        const lastEventInStore = (await eventStore.read(Queries.all, { backwards: true, limit: 1 }).next()).value
        const lastSequenceNumberInStore = lastEventInStore?.sequenceNumber ?? SequenceNumber.zero()

        try {
            const currentCheckPoints = await eventHandlerRegistry.lockHandlers()

            for (const [handlerId, handler] of Object.entries(eventHandlerRegistry.handlers)) {
                currentCheckPoints[handlerId] = await catchupHandler(
                    handler,
                    eventStore,
                    currentCheckPoints[handlerId],
                    lastSequenceNumberInStore
                )
            }
            await eventHandlerRegistry.commitAndRelease(currentCheckPoints)
        } catch (err) {
            await eventHandlerRegistry.rollbackAndRelease()
            throw err
        }
    }
}

export const catchupHandler = async (
    handler: EventHandler,
    eventStore: EventStore,
    currentSeqNumber: SequenceNumber,
    toSequenceNumber: SequenceNumber
) => {
    const query: Query = [{ eventTypes: Object.keys(handler.when) as string[], tags: {} }]
    for await (const event of eventStore.read(query, { fromSequenceNumber: currentSeqNumber.inc() })) {
        if (event.sequenceNumber.value > toSequenceNumber.value) {
            break
        }
        if (handler.when[event.event.type]) await handler.when[event.event.type](event)

        currentSeqNumber = event.sequenceNumber
    }
    return currentSeqNumber
}
