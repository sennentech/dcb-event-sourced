import { Pool, PoolClient } from "pg"
import { v4 as uuid } from "uuid"
import { EventStore } from "@dcb-es/event-store"
import { getTestPgDatabasePool } from "../jest.testPgDbPool"
import { ensureHandlersInstalled } from "./ensureHandlersInstalled"
import { catchupHandlers } from "./catchupHandlers"
import { ensureEventStoreInstalled, PostgresEventStore } from "@dcb-es/event-store-postgres"

describe("UpdatePostgresHandlers tests", () => {
    let pool: Pool
    let client: PoolClient
    let eventStore: EventStore

    const handlers = {
        [uuid().toString()]: { when: {} },
        [uuid().toString()]: { when: {} }
    }

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()
        await ensureEventStoreInstalled(pool)
        await ensureHandlersInstalled(pool, Object.keys(handlers))
    })
    beforeEach(async () => {
        client = await pool.connect()
        await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE")
        eventStore = new PostgresEventStore(client)
    })

    afterEach(async () => {
        await client.query("COMMIT")
        client.release()
        await pool.query("TRUNCATE table events")
        await pool.query("ALTER SEQUENCE events_sequence_number_seq RESTART WITH 1")
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    test("install worked ok", async () => {
        await catchupHandlers(client, eventStore, handlers)
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(Object.keys(handlers)[0])
        expect(result.rows[1].handler_id).toBe(Object.keys(handlers)[1])
    })

    test("should successfully queue multiple parallel requests", async () => {
        await eventStore.append({ type: "testEvent1", data: {}, metadata: {}, tags: {} })
        const promises = Array.from({ length: 10 }, () => catchupHandlers(client, eventStore, handlers))
        await Promise.all(promises)
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(Object.keys(handlers)[0])
        expect(result.rows[1].handler_id).toBe(Object.keys(handlers)[1])
    })
})

