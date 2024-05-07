import { EventHandler } from "../../eventHandling/src/EventHandler"
import { EventHandlerWithState } from "../../eventHandling/src/EventHandlerWithState"
import { AppendCondition, EsEvent, EventStore } from "../../eventStore/src/EventStore"

export const PublishEvent =
    (eventStore: EventStore, projectionRegistry: Record<string, EventHandler>) =>
    async (event: EsEvent, appendCondition: AppendCondition): Promise<void> => {
        //Check all projections that are interested in this event and call catchup
        await eventStore.append(event, appendCondition)
    }
