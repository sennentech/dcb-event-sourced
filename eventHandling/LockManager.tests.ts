import { DataType, IBackup, IMemoryDb, newDb } from "pg-mem"
import { EventHandlerLockManager, PostgresLockManager } from "./LockManager"
import { Pool } from "pg"
import { SequenceNumber } from "../eventStore/SequenceNumber"
import { getPgMemDb } from "../eventStore/utils/getPgMemDb"

describe("LockManager", () => {
    let db = getPgMemDb()

    let lockManager: PostgresLockManager
    const pool: Pool = new (db.adapters.createPg().Pool)()
    let backup: IBackup

    beforeAll(async () => {
        lockManager = new PostgresLockManager(pool, "test-handler")
        await (lockManager as PostgresLockManager).install()
        backup = db.backup()
    })

    beforeEach(async () => {
        backup.restore()
    })

    test("install works ok", async () => {
        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(0)
    })

    test("should obtain lock when first called without throwing error", async () => {
        await lockManager.obtainLock()
    })

    test("should obtain lock and get default sequence number", async () => {
        await lockManager.obtainLock()
        const sequenceNumber = await lockManager.getLastSequenceNumberSeen()
        expect(sequenceNumber.value).toBe(0)
    })

    test("should update sequence number and release lock", async () => {
        await lockManager.obtainLock()
        await lockManager.commitAndRelease(SequenceNumber.create(1))

        const result = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].last_sequence_number).toBe("1")
    })

    test.skip("should rollback and release lock", async () => {
        await lockManager.obtainLock()

        await lockManager.postgresClient.query(`CREATE TABLE test_table (id TEXT)`)
        await lockManager.postgresClient.query(`INSERT INTO test_table (id)  VALUES ('test')`)
        await lockManager.postgresClient.query(
            `INSERT INTO _event_handler_bookmarks (handler_id, last_sequence_number) VALUES ('test-handler-2', '1')`
        )
        const results = await lockManager.postgresClient.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(results.rows).toHaveLength(1)

        const tableExists = await lockManager.postgresClient.query(
            `SELECT * FROM information_schema.tables WHERE table_name = 'test_table'`
        )
        expect(tableExists.rows).toHaveLength(1)

        await lockManager.rollbackAndRelease()

        const resultsGone = await pool.query(`SELECT * FROM _event_handler_bookmarks`)
        expect(resultsGone.rows).toHaveLength(0)
    })
})
