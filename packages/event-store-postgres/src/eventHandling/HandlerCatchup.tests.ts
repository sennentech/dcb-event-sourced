import { Pool, PoolClient } from "pg"
import { v4 as uuid } from "uuid"
import { EventStore, Tags } from "@dcb-es/event-store"
import { ensureHandlersInstalled } from "./ensureHandlersInstalled"
import { HandlerCatchup } from "./HandlerCatchup"
import { getTestPgDatabasePool } from "../../jest.testPgDbPool"
import { PostgresEventStore } from "../eventStore/PostgresEventStore"

describe("UpdatePostgresHandlers tests", () => {
    let pool: Pool
    let client: PoolClient
    let eventStore: PostgresEventStore
    let handlerCatchup: HandlerCatchup
    const handlers = {
        [uuid().toString()]: { when: {} },
        [uuid().toString()]: { when: {} }
    }

    beforeAll(async () => {
        pool = await getTestPgDatabasePool()
        eventStore = new PostgresEventStore(pool)
        handlerCatchup = new HandlerCatchup(pool, eventStore)
        await eventStore.ensureInstalled()
        await handlerCatchup.ensureInstalled(Object.keys(handlers))
    })
    beforeEach(async () => {
        client = await pool.connect()
        await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE")
        eventStore = new PostgresEventStore(client)
        handlerCatchup = new HandlerCatchup(client, eventStore)
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
        await handlerCatchup.catchupHandlers(handlers)
        const result = await pool.query(`SELECT * FROM _handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(Object.keys(handlers)[0])
        expect(result.rows[1].handler_id).toBe(Object.keys(handlers)[1])
    })

    test("should successfully queue multiple parallel requests", async () => {
        await eventStore.append({ type: "testEvent1", data: {}, metadata: {}, tags: Tags.createEmpty() })
        const promises = Array.from({ length: 10 }, () => handlerCatchup.catchupHandlers(handlers))
        await Promise.all(promises)
        const result = await pool.query(`SELECT * FROM _handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(Object.keys(handlers)[0])
        expect(result.rows[1].handler_id).toBe(Object.keys(handlers)[1])
    })
})
