import {
    EventStore,
    EsEvent,
    AppendCondition,
    AnyCondition,
    SequenceNumber,
    EsQueryCriterion,
    EsEventEnvelope
} from "@dcb-es/event-store"
import { EventHandler } from "./EventHandler"
import { EventHandlerRegistry } from "./EventHandlerRegistry"

export class EventPublisher {
    constructor(
        private eventStore: EventStore,
        private eventHandlerRegistry?: EventHandlerRegistry
    ) {}

    async publish(events: EsEvent | EsEvent[], appendCondition: AppendCondition | AnyCondition): Promise<void> {
        const { eventStore, eventHandlerRegistry } = this

        if (!eventHandlerRegistry) {
            await eventStore.append(events, appendCondition)
            return
        }

        const lastEventInStore = (await eventStore.readAll({ backwards: true, limit: 1 }).next()).value
        const lastSequenceNumberInStore = lastEventInStore?.sequenceNumber ?? SequenceNumber.zero()

        const newEventEnvelopes = await eventStore.append(events, appendCondition)
        const toSequenceNumber = newEventEnvelopes.at(-1).sequenceNumber

        try {
            const currentCheckPoints = await eventHandlerRegistry.lockHandlers()

            for (const [handlerId, handler] of Object.entries(eventHandlerRegistry.handlers)) {
                const requiresCatchup = currentCheckPoints[handlerId] < lastSequenceNumberInStore

                if (requiresCatchup) {
                    currentCheckPoints[handlerId] = await catchupHandler(
                        handler,
                        eventStore,
                        currentCheckPoints[handlerId],
                        toSequenceNumber
                    )
                } else {
                    currentCheckPoints[handlerId] = await applyNewEventsDirectly(newEventEnvelopes, handler)
                }
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
    const criteria: EsQueryCriterion[] = [{ eventTypes: Object.keys(handler.when) as string[], tags: {} }]
    for await (const event of eventStore.read({ criteria }, { fromSequenceNumber: currentSeqNumber.inc() })) {
        if (event.sequenceNumber.value > toSequenceNumber.value) {
            break
        }
        if (handler.when[event.event.type]) await handler.when[event.event.type](event)

        currentSeqNumber = event.sequenceNumber
    }
    return currentSeqNumber
}

const applyNewEventsDirectly = async (newEventEnvelopes: EsEventEnvelope<EsEvent>[], handler: EventHandler) => {
    let currentSeqNumber: SequenceNumber
    for (const event of newEventEnvelopes) {
        if (handler.when[event.event.type]) await handler.when[event.event.type](event)
        currentSeqNumber = event.sequenceNumber
    }
    return currentSeqNumber
}
