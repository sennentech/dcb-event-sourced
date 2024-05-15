export const createReadEventsFnSql = `
CREATE OR REPLACE FUNCTION read_events(criteria JSONB, from_seq_no BIGINT DEFAULT 0, read_backwards BOOLEAN DEFAULT false)
RETURNS SETOF events AS $$
DECLARE
    query TEXT;
    event_types TEXT[];
BEGIN
    -- Extract eventTypes from JSONB criteria and convert to TEXT[]
    IF criteria->'eventTypes' IS NOT NULL THEN
        SELECT array_agg(value::text) INTO event_types
        FROM jsonb_array_elements_text(criteria->'eventTypes');
    END IF;

    -- Construct the query dynamically based on the input JSONB criteria
    query := 'SELECT * FROM events WHERE sequence_number ' || 
             (CASE WHEN read_backwards THEN '<=' ELSE '>=' END) || ' $1 ';

    -- Add event type conditions if specified
    IF event_types IS NOT NULL THEN
        query := query || 'AND type = ANY($2) ';
    END IF;
    
    -- Add tag conditions if specified
    IF criteria->'tags' IS NOT NULL THEN
        query := query || 'AND tags @> $3 ';
    END IF;

    -- Add ordering
    query := query || (CASE WHEN read_backwards THEN 'ORDER BY sequence_number DESC' ELSE 'ORDER BY sequence_number ASC' END);

    -- Execute the query
    RETURN QUERY EXECUTE query USING from_seq_no, event_types, criteria->'tags';
END;
$$ LANGUAGE plpgsql;

`
