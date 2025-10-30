-- Populate organization_id for existing agents
-- Associate agents with the organizations where their creators are members

UPDATE agents
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = agents.user_id
  AND om.status = 'active'
  ORDER BY om.joined_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM agents
  WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE 'Updated % agents with organization_id', updated_count;
END $$;

-- Make organization_id NOT NULL for future inserts (optional)
-- Uncomment if you want to enforce this
-- ALTER TABLE agents ALTER COLUMN organization_id SET NOT NULL;


