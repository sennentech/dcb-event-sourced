import { Pool } from "pg"
import { POSTGRES_TABLE_NAME } from "./catchupHandlers"

export const ensureHandlersInstalled = async (pool: Pool, handlerIds: string[]) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${POSTGRES_TABLE_NAME} (
            handler_id TEXT PRIMARY KEY,
            last_sequence_number BIGINT
        );`
    )

    await pool.query(`
        INSERT INTO ${POSTGRES_TABLE_NAME} (handler_id, last_sequence_number)
                SELECT handler_id, 0
                FROM unnest($1::text[]) handler_id
                ON CONFLICT (handler_id) DO NOTHING
    `, [handlerIds])
}