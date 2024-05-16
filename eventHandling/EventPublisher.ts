import { AnyCondition, AppendCondition, EsEvent, EsQueryCriterion, EventStore } from "../eventStore/EventStore"
import { SequenceNumber } from "../eventStore/SequenceNumber"
import { ensureIsArray } from "../eventStore/memoryEventStore/MemoryEventStore"
import { EventHandler, ProjectionRegistry } from "./EventHandler"
import * as R from "ramda"
import { EventHandlerLockManager } from "./lockManager/LockManager"

export class EventPublisher {
    constructor(
        private eventStore: EventStore,
        private projectionRegistry?: ProjectionRegistry
    ) {}

    async publish(events: EsEvent | EsEvent[], appendCondition: AppendCondition | AnyCondition): Promise<void> {
        const { lastSequenceNumber } = await this.eventStore.append(events, appendCondition)

        const projectionsToCatchup: ProjectionRegistry = []
        for (const projection of this.projectionRegistry ?? []) {
            const handlerEventTypes = R.keys(projection.handler.when)
            const eventTypes = ensureIsArray(events).map(events => events.type)
            if (R.intersection(handlerEventTypes, eventTypes).length > 0) projectionsToCatchup.push(projection)
        }

        const handlerCatchup = new HandlerCatchup(this.eventStore, projectionsToCatchup)
        await handlerCatchup.catchup(lastSequenceNumber)
    }
}

export class HandlerCatchup {
    constructor(
        private eventStore: EventStore,
        private projectionRegistry: ProjectionRegistry
    ) {}

    async catchup(toSequenceNumber: SequenceNumber) {
        const catchupOne = async (opts: { handler: EventHandler; lockManager: EventHandlerLockManager }) => {
            const { handler, lockManager } = opts
            try {
                const lastSequenceNumberSeen = await lockManager.obtainLock()
                const criteria: EsQueryCriterion[] = [{ eventTypes: R.keys(handler.when) as string[], tags: {} }]

                let currentSeqNumber = lastSequenceNumberSeen
                for await (const event of this.eventStore.read(
                    { criteria },
                    { fromSequenceNumber: currentSeqNumber.inc() }
                )) {
                    if (event.sequenceNumber.value > toSequenceNumber.value) {
                        break
                    }
                    await handler.when[event.event.type](event)
                    currentSeqNumber = event.sequenceNumber
                }
                await lockManager.commitAndRelease(currentSeqNumber)
            } catch (err) {
                await lockManager.rollbackAndRelease()
                throw err
            }
        }

        const pendingHandlerCatchups = this.projectionRegistry.map(catchupOne)

        const results = await Promise.all(pendingHandlerCatchups)
        // const failedCatchups = results.filter(result => result.status === "rejected")
        // if (failedCatchups.length > 0) {
        //     throw new Error(`Failed to catchup ${failedCatchups.length} handlers`)
        // }
    }
}
