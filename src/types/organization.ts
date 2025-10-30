export interface Organization {
  id: string
  name: string
  slug: string
  owner_id: string
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise'
  max_agents: number
  max_members: number
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'inactive' | 'invited'
  invited_by?: string
  invited_at?: string
  joined_at: string
  user_email?: string
  user_name?: string
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  invited_by: string
  expires_at: string
  accepted_at?: string
  created_at: string
  organization_name?: string
  inviter_email?: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  user_email?: string
}

export const ROLE_PERMISSIONS = {
  owner: {
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: true,
    canInviteMembers: true,
    canManageMembers: true,
    canManageBilling: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  admin: {
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: true,
    canInviteMembers: true,
    canManageMembers: true,
    canManageBilling: false,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  member: {
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: false,
    canInviteMembers: false,
    canManageMembers: false,
    canManageBilling: false,
    canViewAnalytics: true,
    canManageSettings: false,
  },
  viewer: {
    canCreateAgents: false,
    canEditAgents: false,
    canDeleteAgents: false,
    canInviteMembers: false,
    canManageMembers: false,
    canManageBilling: false,
    canViewAnalytics: true,
    canManageSettings: false,
  },
}

