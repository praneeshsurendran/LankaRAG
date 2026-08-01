-- Optional init SQL mounted into Docker postgres container.
-- The ingest.py script handles this programmatically, but this file
-- serves as documentation and for docker-entrypoint-initdb.d.

-- (This file is intentionally minimal — ingest.py creates the schema)
SELECT 1; -- no-op to satisfy Docker mount requirement
