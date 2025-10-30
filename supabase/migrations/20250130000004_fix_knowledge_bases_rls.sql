-- Fix RLS policies for knowledge_bases and populate organization_id

-- 1. Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can insert their own knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can update their own knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can delete their own knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "select_knowledge_bases" ON knowledge_bases;
DROP POLICY IF EXISTS "insert_knowledge_bases" ON knowledge_bases;
DROP POLICY IF EXISTS "update_knowledge_bases" ON knowledge_bases;
DROP POLICY IF EXISTS "delete_knowledge_bases" ON knowledge_bases;

-- 2. Create simple policies without recursion
-- SELECT: View if in same organization OR admin
CREATE POLICY "select_knowledge_bases"
ON knowledge_bases
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- INSERT: Insert if in organization OR admin
CREATE POLICY "insert_knowledge_bases"
ON knowledge_bases
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- UPDATE: Same as SELECT
CREATE POLICY "update_knowledge_bases"
ON knowledge_bases
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- DELETE: Same as SELECT
CREATE POLICY "delete_knowledge_bases"
ON knowledge_bases
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- 3. Populate organization_id for existing knowledge_bases from their agents
UPDATE knowledge_bases
SET organization_id = (
  SELECT a.organization_id
  FROM agents a
  WHERE a.id = knowledge_bases.agent_id
)
WHERE organization_id IS NULL;

