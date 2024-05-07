import { EventHandler } from "../../eventHandling/EventHandler"
import { EventHandlerWithState } from "../../eventHandling/EventHandlerWithState"
import { AppendCondition, EsEvent, EventStore } from "../../eventStore/EventStore"

export const PublishEvent =
    (eventStore: EventStore, projectionRegistry: Record<string, EventHandler>) =>
    async (event: EsEvent, appendCondition: AppendCondition): Promise<void> => {
        //Check all projections that are interested in this event and call catchup
        await eventStore.append(event, appendCondition)
    }
