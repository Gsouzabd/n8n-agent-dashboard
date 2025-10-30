-- Remove ALL policies and recreate with NO recursion
-- Simplest approach: admin sees all, users see their own

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view memberships" ON organization_members;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON organization_members;
DROP POLICY IF EXISTS "Allow update for users and admin" ON organization_members;
DROP POLICY IF EXISTS "Allow delete for users and admin" ON organization_members;

-- SELECT: Admin sees all, users see their own
CREATE POLICY "select_members"
ON organization_members
FOR SELECT
USING (
  (auth.jwt() ->> 'email') = 'admin@admin.com'
  OR
  auth.uid() = user_id
);

-- INSERT: Admin and authenticated users can insert
CREATE POLICY "insert_members"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email') = 'admin@admin.com'
  OR
  auth.uid() = user_id
);

-- UPDATE: Admin and own records
CREATE POLICY "update_members"
ON organization_members
FOR UPDATE
USING (
  (auth.jwt() ->> 'email') = 'admin@admin.com'
  OR
  auth.uid() = user_id
);

-- DELETE: Admin and own records
CREATE POLICY "delete_members"
ON organization_members
FOR DELETE
USING (
  (auth.jwt() ->> 'email') = 'admin@admin.com'
  OR
  auth.uid() = user_id
);

