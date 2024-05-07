import { DataType, IMemoryDb, newDb } from "pg-mem"
export const getPgMemDb = (): IMemoryDb => {
    const db = newDb()
    db.public.registerFunction({
        name: "pg_try_advisory_lock",
        args: [DataType.text],
        returns: DataType.text,
        implementation: lockKey => ({
            rows: [{ pg_try_advisory_lock: true }]
        })
    })
    return db
}
