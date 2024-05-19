import { Pool } from "pg"
import { SequenceNumber } from "../../eventStore/SequenceNumber"
import { PostgresLockManager } from "./PostgresLockManager"
import { StartedPostgreSqlContainer, PostgreSqlContainer } from "@testcontainers/postgresql"
import { v4 as uuid } from "uuid"

describe("LockManager", () => {
    let pgContainer: StartedPostgreSqlContainer
    let pool: Pool

    beforeAll(async () => {
        pgContainer = await new PostgreSqlContainer()
            .withDatabase("int_tests")
            .withUsername("test")
            .withPassword("test")
            .start()

        pool = new Pool({
            connectionString: pgContainer.getConnectionUri()
        })
        const lockManager = new PostgresLockManager(pool, uuid().toString())
        await lockManager.install()
    })

    afterAll(async () => {
        await pool.end()
        await pgContainer.stop()
    })

    test("install worked ok", async () => {
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(0)
    })

    test("should obtain lock when first called without throwing error", async () => {
        const lockManager = new PostgresLockManager(pool, uuid().toString())
        const seqNo = await lockManager.obtainLock()
        await lockManager.commitAndRelease(seqNo)
    })

    test("should obtain lock and get default sequence number", async () => {
        const lockManager = new PostgresLockManager(pool, uuid().toString())
        const sequenceNumber = await lockManager.obtainLock()
        expect(sequenceNumber.value).toBe(0)
        await lockManager.commitAndRelease(sequenceNumber)
    })

    test("should update sequence number and release lock", async () => {
        const id = uuid().toString()
        const lockManager = new PostgresLockManager(pool, id)
        await lockManager.obtainLock()
        await lockManager.commitAndRelease(SequenceNumber.create(1))

        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks where handler_id = $1`, [id])
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].last_sequence_number).toBe(1)
    })

    test("should rollback and release lock", async () => {
        const lockManager = new PostgresLockManager(pool, uuid().toString())
        await lockManager.obtainLock()

        await lockManager.postgresClient.query(`CREATE TABLE test_table (id TEXT)`)
        await lockManager.postgresClient.query(`INSERT INTO test_table (id)  VALUES ('test')`)
        await lockManager.postgresClient.query(
            `INSERT INTO _event_handler_bookmarks (handler_id, last_sequence_number) VALUES ('test-handler-2', '1')`
        )
        const results = await lockManager.postgresClient.query(
            `SELECT * FROM _event_handler_bookmarks where handler_id = 'test-handler-2'`
        )
        expect(results.rows).toHaveLength(1)

        const tableExists = await lockManager.postgresClient.query(
            `SELECT * FROM information_schema.tables WHERE table_name = 'test_table'`
        )
        expect(tableExists.rows).toHaveLength(1)

        await lockManager.rollbackAndRelease()

        const resultsGone = await pool.query(
            `SELECT * FROM _event_handler_bookmarks where handler_id = 'test-handler-2'`
        )
        expect(resultsGone.rows).toHaveLength(0)
    })
})
