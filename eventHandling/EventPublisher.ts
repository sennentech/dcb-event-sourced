import { AnyCondition, AppendCondition, EsEvent, EventStore } from "../eventStore/EventStore"
import { ProjectionRegistry } from "./EventHandler"

export class EventPublisher {
    constructor(
        private eventStore: EventStore,
        private projectionRegistry?: ProjectionRegistry
    ) {}

    async publish(events: EsEvent | EsEvent[], appendCondition: AppendCondition | AnyCondition): Promise<void> {
        await this.eventStore.append(events, appendCondition)

        //Check all projections that are interested in this event and call catchup
    }
}
