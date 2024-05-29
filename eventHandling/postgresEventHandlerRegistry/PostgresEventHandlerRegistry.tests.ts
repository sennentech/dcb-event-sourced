import { Pool } from "pg"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { PostgresEventHandlerRegistry } from "./PostgresEventHandlerRegistry"
import { v4 as uuid } from "uuid"
import { PostgresTransactionManager } from "./PostgresTransactionManager"

describe("PostgresEventHandlerRegistry tests", () => {
    let pool: Pool
    let transactionManager: PostgresTransactionManager
    let handlerRegistry: PostgresEventHandlerRegistry
    const handlers = {
        [uuid().toString()]: null,
        [uuid().toString()]: null
    }

    beforeAll(async () => {
        pool = new Pool({
            connectionString: await global.__GET_TEST_PG_DATABASE_URI()
        })
        transactionManager = new PostgresTransactionManager(pool)
        handlerRegistry = new PostgresEventHandlerRegistry(transactionManager, handlers)
        await handlerRegistry.install()
    })

    afterAll(async () => {
        if (pool) await pool.end()
    })

    test("install worked ok", async () => {
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(Object.keys(handlers)[0])
        expect(result.rows[1].handler_id).toBe(Object.keys(handlers)[1])
    })

    test("should obtain lock when first called without throwing error", async () => {
        const locks = await handlerRegistry.lockHandlers()
        await handlerRegistry.commitAndRelease(locks)
    })

    test("should obtain lock and get default sequence number", async () => {
        const locks = await handlerRegistry.lockHandlers()
        Object.values(locks).forEach(sequenceNumber => {
            expect(sequenceNumber.value).toBe(0)
        })
        await handlerRegistry.commitAndRelease(locks)
    })

    test("should update sequence number and release lock", async () => {
        const locks = await handlerRegistry.lockHandlers()
        Object.keys(locks).forEach(handlerId => {
            locks[handlerId] = SequenceNumber.create(1)
        })
        await handlerRegistry.commitAndRelease(locks)

        for (const handlerId of Object.keys(handlers)) {
            const result = await pool.query(`SELECT * FROM _event_handler_bookmarks WHERE handler_id = $1`, [handlerId])
            expect(result.rows).toHaveLength(1)
            expect(result.rows[0].last_sequence_number).toBe("1")
        }
    })

    test("should rollback and release lock", async () => {
        await handlerRegistry.lockHandlers()

        await transactionManager.client.query(`CREATE TABLE test_table (id TEXT)`)
        await transactionManager.client.query(`INSERT INTO test_table (id) VALUES ('test')`)

        const result = await transactionManager.client.query(`SELECT * FROM test_table`)
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].id).toBe("test")

        const tableExists = await transactionManager.client.query(
            `SELECT * FROM information_schema.tables WHERE table_name = 'test_table'`
        )
        expect(tableExists.rows).toHaveLength(1)

        await handlerRegistry.rollbackAndRelease()

        const resultsGone = await pool.query(`SELECT * FROM information_schema.tables WHERE table_name = 'test_table'`)
        expect(resultsGone.rows).toHaveLength(0)
    })

    test("should throw error when committing without obtaining lock", async () => {
        await expect(handlerRegistry.commitAndRelease({ [handlers[0]]: SequenceNumber.create(1) })).rejects.toThrow(
            "No lock obtained, cannot commit"
        )
        await handlerRegistry.rollbackAndRelease()
    })

    test("should throw error when committing without sequence number", async () => {
        await handlerRegistry.lockHandlers()
        await expect(handlerRegistry.commitAndRelease({ [handlers[0]]: null })).rejects.toThrow(
            "Sequence number is required to commit"
        )
        await handlerRegistry.rollbackAndRelease()
    })

    test("should throw an error when second lock on same id is attempted", async () => {
        const secondhandlerRegistry = new PostgresEventHandlerRegistry(new PostgresTransactionManager(pool), handlers)

        await handlerRegistry.lockHandlers()
        await expect(secondhandlerRegistry.lockHandlers()).rejects.toThrow(
            "Could not obtain lock as it is already locked by another process"
        )
        await handlerRegistry.rollbackAndRelease()
        await secondhandlerRegistry.rollbackAndRelease()
    })
})
