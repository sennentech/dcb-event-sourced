import { SequenceNumber } from "../../eventStore/SequenceNumber"

export interface EventHandlerLockManager {
    obtainLock(): Promise<SequenceNumber>
    commitAndRelease(sequenceNumber: SequenceNumber): Promise<void>
    rollbackAndRelease(): Promise<void>
}

export type LockResult = { handler: string; sequenceNumber: SequenceNumber }[]

export interface MultiEventHandlerLockManager {
    obtainLock(): Promise<LockResult>
    commitAndRelease(locks: LockResult): Promise<LockResult>
    rollbackAndRelease(locks: LockResult): Promise<void>
}
