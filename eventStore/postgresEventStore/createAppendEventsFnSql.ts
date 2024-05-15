export const createAppendEventsFnSql = `
CREATE OR REPLACE FUNCTION append_events_jsonb(
    events_jsonb JSONB, 
    conditions JSONB,  -- Array of JSON objects with 'condition_types' and 'condition_tags'
    max_seq_no BIGINT
) RETURNS BIGINT AS $$
DECLARE
    last_seq_no BIGINT;
    cond JSONB;
BEGIN
    -- Perform a preliminary conflict check for each condition in the conditions array
    FOR cond IN SELECT * FROM jsonb_array_elements(conditions)
    LOOP
        IF cond->'condition_types' IS NOT NULL AND cond->'condition_tags' IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM events
                WHERE sequence_number > max_seq_no
                AND type = ANY(cond->'condition_types'::text[])
                AND tags @> cond->'condition_tags'
                AND NOT (tags @> cond->'condition_tags' AND cond->'condition_tags' @> tags)  -- ensure exact match of tags
            ) THEN
                RAISE EXCEPTION 'Expected Version fail: New events matching appendCondition found.';
            END IF;
        END IF;
    END LOOP;

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
