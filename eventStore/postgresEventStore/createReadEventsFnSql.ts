export const createReadEventsFnSql = `
CREATE OR REPLACE FUNCTION read_events(event_types jsonb, tags jsonb, from_seq_no bigint, read_backwards boolean)
RETURNS TABLE(type text, data jsonb, tags jsonb, "timestamp" timestamp, sequence_number bigint) AS $$
DECLARE
    query text := '';
    type text;
BEGIN
    -- Dynamically build the SQL query for each event type and tags
    FOR type IN SELECT * FROM jsonb_array_elements_text(event_types) LOOP
        IF query <> '' THEN
            query := query || ' UNION ALL ';
        END IF;
        query := query || format(
            'SELECT type, e.data, e.tags, e."timestamp", e.sequence_number FROM events e WHERE type = %L AND sequence_number > %s AND tags @> %L',
            type, from_seq_no, tags::text
        );
    END LOOP;

    IF read_backwards THEN
        query := query || ' ORDER BY sequence_number DESC';
    ELSE
        query := query || ' ORDER BY sequence_number ASC';
    END IF;

    RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql;


`
