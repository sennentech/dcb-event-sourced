import { Pool, PoolClient } from "pg"
import { EventHandler } from "../EventHandler"
import { PostgresMultiLockManager } from "./PostgresMultiLockManager"
import { MultiEventHandlerLockManager } from "./LockManager"
import { EsEvent, EsEventEnvelope, EventStore } from "../../eventStore/EventStore"
import { SequenceNumber } from "../../eventStore/SequenceNumber"

export class PoolClientManager {
    constructor(public pool: Pool) {}
    public client: PoolClient

    public async startTransaction() {
        this.client = await this.pool.connect()
        this.client.query("BEGIN;")
    }

    unsetClient() {
        this.client = null
    }
}

export class PostgresEventHandlerRegistry {
    #lockManager: PostgresMultiLockManager
    constructor(
        public readonly handlers: Record<string, EventHandler>,
        private readonly clientManager: PoolClientManager,
        private readonly eventStore: EventStore
    ) {
        this.#lockManager = new PostgresMultiLockManager()
    }

    async obtainLocks() {
        try {
            const client = await this.clientManager.startTransaction()
            const locks = await this.#lockManager.obtainLock(this.clientManager.client)
        } catch (err) {
            throw err
        }
    }


}
