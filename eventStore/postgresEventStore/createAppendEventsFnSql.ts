export const createAppendEventsFnSql = `
CREATE OR REPLACE FUNCTION append_events_jsonb(
    events_jsonb JSONB, 
    condition_types TEXT[], 
    condition_tags JSONB, 
    max_seq_no BIGINT
) RETURNS BIGINT AS $$
DECLARE
    last_seq_no BIGINT;
BEGIN
    -- Perform a preliminary conflict check before attempting to insert
    IF array_length(condition_types, 1) > 0 AND condition_tags IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM events
            WHERE sequence_number > max_seq_no
            AND type = ANY(condition_types)
            AND tags @> condition_tags
            AND NOT (tags @> condition_tags AND condition_tags @> tags)  -- ensure exact match of tags
        ) THEN
            RAISE EXCEPTION 'Expected Version fail: New events matching appendCondition found.';
        END IF;
    END IF;

    -- Insert all events in one operation using jsonb_array_elements
    INSERT INTO events (type, data, tags)
    SELECT 
        event->>'type', 
        event->'data', 
        event->'tags'
    FROM jsonb_array_elements(events_jsonb) as event
    RETURNING sequence_number INTO last_seq_no;

    -- Return the sequence number of the last inserted event
    RETURN last_seq_no;
END;
$$ LANGUAGE plpgsql;



`
