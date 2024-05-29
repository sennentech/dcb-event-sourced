import { SequenceNumber } from "../eventStore/SequenceNumber"
import { EventHandler } from "./EventHandler"

export type HandlerProgress = Record<string, SequenceNumber>
export interface EventHandlerRegistry {
    handlers: Record<string, EventHandler>
    install(): Promise<void>
    lockHandlers(): Promise<HandlerProgress>
    commitAndRelease(progress: HandlerProgress): Promise<void>
    rollbackAndRelease(): Promise<void>
}
