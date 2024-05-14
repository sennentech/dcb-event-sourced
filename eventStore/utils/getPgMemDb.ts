import { DataType, IMemoryDb, newDb } from "pg-mem"
export const getPgMemDb = (): IMemoryDb => {
    const db = newDb()

    /*
       pg-mem extensions here
    */
    return db
}
