export const createAppendEventsFnSql = `
CREATE OR REPLACE FUNCTION append_events(
    events_to_append JSONB, 
    conditions JSONB,
    max_seq_no BIGINT
) RETURNS BIGINT AS $$
DECLARE
    last_seq_no BIGINT;
    cond JSONB;
BEGIN
    FOR cond IN SELECT * FROM jsonb_array_elements(conditions)
    LOOP 
        -- Ensure that EXISTS is correctly used within an IF statement
        IF EXISTS (
            SELECT 1 
            FROM events
            WHERE sequence_number > max_seq_no
            AND type = ANY(SELECT jsonb_array_elements_text(cond->'eventTypes'))
            AND tags @> (cond->'tags')::JSONB
        ) THEN
            RAISE EXCEPTION 'Expected Version fail: New events matching appendCondition found.';
        END IF;
    END LOOP;

    -- Insert all events in one operation using jsonb_array_elements
    INSERT INTO events (type, data, tags)
    SELECT 
        event->>'type', 
        event->'data', 
        event->'tags'
    FROM jsonb_array_elements(events_to_append) as event
    RETURNING sequence_number INTO last_seq_no;

    -- Return the sequence number of the last inserted event
    RETURN last_seq_no;
END;
$$ LANGUAGE plpgsql;


`
