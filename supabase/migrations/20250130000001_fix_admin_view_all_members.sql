-- Allow admin@admin.com to view ALL organization members
-- Allow users to view their own memberships
-- Allow organization owners/admins to view members of their orgs

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Authenticated users can create memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON organization_members;

-- SELECT: Allow reading for:
-- 1. Own memberships
-- 2. If user is admin@admin.com (check via auth.jwt())
-- 3. Members of organizations where user is owner/admin
CREATE POLICY "Users can view memberships"
ON organization_members
FOR SELECT
USING (
  -- Can view own memberships
  auth.uid() = user_id
  OR
  -- Admin master can view all
  (auth.jwt() ->> 'email') = 'admin@admin.com'
  OR
  -- Can view members of organizations where user is owner or admin
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- INSERT: Allow authenticated users to insert (app logic controls)
CREATE POLICY "Allow insert for authenticated"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- UPDATE: Allow users to update their own, or admin to update any
CREATE POLICY "Allow update for users and admin"
ON organization_members
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'email') = 'admin@admin.com'
);

-- DELETE: Allow users to delete their own, or admin to delete any
CREATE POLICY "Allow delete for users and admin"
ON organization_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'email') = 'admin@admin.com'
);

