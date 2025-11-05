-- Fix RLS policy for chat_sessions DELETE to allow org admins to delete sessions
-- This allows organization admins/owners to delete chat sessions from agents in their organization

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete their chat sessions" ON chat_sessions;

-- Create new DELETE policy that allows:
-- 1. Users to delete their own sessions
-- 2. Organization admins/owners to delete sessions from agents in their organization
CREATE POLICY "Users and org admins can delete chat sessions"
  ON chat_sessions FOR DELETE
  USING (
    -- Users can delete their own sessions
    auth.uid() = user_id
    OR
    -- Organization admins/owners can delete sessions from agents in their organization
    EXISTS (
      SELECT 1
      FROM agents a
      JOIN organization_members om ON om.organization_id = a.organization_id
      WHERE a.id = chat_sessions.agent_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

