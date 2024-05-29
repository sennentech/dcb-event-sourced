import { Pool, PoolClient } from "pg"

export class PostgresTransactionManager {
    constructor(public pool: Pool) {}
    public client: PoolClient

    public async startTransaction() {
        if (this.client) throw new Error("Transaction already in progress")
        this.client = await this.pool.connect()
        await this.client.query("BEGIN;")
    }

    public get transactionInProgress() {
        return !!this.client
    }

    public async commit() {
        await this.client.query("COMMIT;")
        this.client.release()
        this.client = null
    }

    public async rollback() {
        await this.client.query("ROLLBACK;")
        this.client.release()
        this.client = null
    }
}
