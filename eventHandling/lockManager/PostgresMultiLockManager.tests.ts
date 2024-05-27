import { Pool } from "pg"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { PostgresMultiLockManager } from "./PostgresMultiLockManager"
import { StartedPostgreSqlContainer, PostgreSqlContainer } from "@testcontainers/postgresql"
import { v4 as uuid } from "uuid"

describe("MultiLockManager", () => {
    let pgContainer: StartedPostgreSqlContainer
    let pool: Pool
    const handlers = [uuid().toString(), uuid().toString()]

    beforeAll(async () => {
        pgContainer = await new PostgreSqlContainer().start()
        pool = new Pool({
            connectionString: pgContainer.getConnectionUri()
        })
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        await lockManager.install()
    })

    afterAll(async () => {
        await pool.end()
        await pgContainer.stop()
    })

    test("install worked ok", async () => {
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].handler_id).toBe(handlers[0])
        expect(result.rows[1].handler_id).toBe(handlers[1])
    })

    test("should obtain lock when first called without throwing error", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const locks = await lockManager.obtainLock()
        await lockManager.commitAndRelease(locks)
    })

    test("should obtain lock and get default sequence number", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const locks = await lockManager.obtainLock()
        locks.forEach(lock => {
            expect(lock.sequenceNumber.value).toBe(0)
        })
        await lockManager.commitAndRelease(locks)
    })

    test("should update sequence number and release lock", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const locks = await lockManager.obtainLock()
        const updatedLocks = locks.map(lock => ({
            ...lock,
            sequenceNumber: SequenceNumber.create(1)
        }))
        await lockManager.commitAndRelease(updatedLocks)

        for (const handler of handlers) {
            const result = await pool.query(`SELECT * FROM _event_handler_bookmarks WHERE handler_id = $1`, [handler])
            expect(result.rows).toHaveLength(1)
            expect(result.rows[0].last_sequence_number).toBe("1")
        }
    })

    test("should rollback and release lock", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const locks = await lockManager.obtainLock()

        await lockManager.postgresClient.query(`CREATE TABLE test_table (id TEXT)`)
        await lockManager.postgresClient.query(`INSERT INTO test_table (id) VALUES ('test')`)
        await lockManager.postgresClient.query(
            `INSERT INTO _event_handler_bookmarks (handler_id, last_sequence_number) VALUES ('test-handler-2', '1')`
        )
        const results = await lockManager.postgresClient.query(
            `SELECT * FROM _event_handler_bookmarks WHERE handler_id = 'test-handler-2'`
        )
        expect(results.rows).toHaveLength(1)

        const tableExists = await lockManager.postgresClient.query(
            `SELECT * FROM information_schema.tables WHERE table_name = 'test_table'`
        )
        expect(tableExists.rows).toHaveLength(1)

        await lockManager.rollbackAndRelease()

        const resultsGone = await pool.query(
            `SELECT * FROM _event_handler_bookmarks WHERE handler_id = 'test-handler-2'`
        )
        expect(resultsGone.rows).toHaveLength(0)
    })

    test("should throw error when committing without obtaining lock", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        await expect(
            lockManager.commitAndRelease([{ handler: handlers[0], sequenceNumber: SequenceNumber.create(1) }])
        ).rejects.toThrow("No lock obtained, cannot commit")
        await lockManager.rollbackAndRelease()
    })

    test("should throw error when committing without sequence number", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const locks = await lockManager.obtainLock()
        await expect(lockManager.commitAndRelease([{ handler: handlers[0], sequenceNumber: null }])).rejects.toThrow(
            "Sequence number is required to commit"
        )
        await lockManager.rollbackAndRelease()
    })

    test("should throw an error when second lock on same id is attempted", async () => {
        const lockManager = new PostgresMultiLockManager(pool, handlers)
        const secondLockManager = new PostgresMultiLockManager(pool, handlers)

        await lockManager.obtainLock()
        await expect(secondLockManager.obtainLock()).rejects.toThrow(
            "Could not obtain lock as it is already locked by another process"
        )
        await lockManager.rollbackAndRelease()
        await secondLockManager.rollbackAndRelease()
    })
})
