import { AnyCondition, AppendCondition, EsEvent, EsQueryCriterion, EventStore } from "../../eventStore/EventStore"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import * as R from "ramda"
import { EventHandlerRegistry } from "../EventHandlerRegistry"

export class EventPublisher {
    constructor(
        private eventStore: EventStore,
        private eventHandlerRegistry?: EventHandlerRegistry
    ) {}

    async publish(events: EsEvent | EsEvent[], appendCondition: AppendCondition | AnyCondition): Promise<void> {
        if (!this.eventHandlerRegistry) {
            await this.eventStore.append(events, appendCondition)
            return
        }

        const { eventStore, eventHandlerRegistry: eventHandlerRegistry } = this
        const lastEventInStore = (await this.eventStore.readAll({ backwards: true, limit: 1 }).next()).value
        const lastSequenceNumberInStore = lastEventInStore?.sequenceNumber ?? SequenceNumber.zero()

        const newEventEnvelopes = await this.eventStore.append(events, appendCondition)
        const toSequenceNumber = newEventEnvelopes.at(-1).sequenceNumber

        try {
            const currentProgress = await eventHandlerRegistry.lockHandlers()

            for (const [handlerId, handler] of Object.entries(eventHandlerRegistry.handlers)) {
                const lastSequenceNumberSeen = currentProgress[handlerId]
                const criteria: EsQueryCriterion[] = [{ eventTypes: R.keys(handler.when) as string[], tags: {} }]
                let currentSeqNumber = lastSequenceNumberSeen
                for await (const event of eventStore.read(
                    { criteria },
                    { fromSequenceNumber: currentSeqNumber.inc() }
                )) {
                    if (event.sequenceNumber.value > toSequenceNumber.value) {
                        break
                    }
                    await handler.when[event.event.type](event)
                    currentSeqNumber = event.sequenceNumber
                }
                currentProgress[handlerId] = currentSeqNumber
            }
            await eventHandlerRegistry.commitAndRelease(currentProgress)
        } catch (err) {
            await eventHandlerRegistry.rollbackAndRelease()
            throw err
        }
    }
}
