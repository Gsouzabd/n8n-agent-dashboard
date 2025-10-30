-- Fix RLS policies for organization_members to allow users to read their own memberships

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON organization_members;
DROP POLICY IF EXISTS "enable_read_for_organization_members" ON organization_members;

-- Recreate simplified policies
-- SELECT: Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Authenticated users can insert (application logic controls this)
CREATE POLICY "Authenticated users can create memberships"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Users can update their own memberships
CREATE POLICY "Users can update their own memberships"
ON organization_members
FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own memberships
CREATE POLICY "Users can delete their own memberships"
ON organization_members
FOR DELETE
USING (auth.uid() = user_id);

-- Comment explaining the policies
COMMENT ON TABLE organization_members IS 'RLS policies allow users to read/manage their own memberships. Admin logic is handled at application level.';

