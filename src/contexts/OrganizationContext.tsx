import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Organization, OrganizationMember, ROLE_PERMISSIONS } from '@/types/organization'

interface OrganizationContextType {
  currentOrganization: Organization | null
  organizations: Organization[]
  currentMember: OrganizationMember | null
  loading: boolean
  switchOrganization: (orgId: string) => void
  refreshOrganizations: () => Promise<void>
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS.owner) => boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null)
  const [loading, setLoading] = useState(true)

  // Recarregar organizações quando o usuário mudar (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Limpar estado anterior
        setOrganizations([])
        setCurrentOrganization(null)
        setCurrentMember(null)
        // Recarregar organizações
        loadOrganizations()
      } else if (event === 'SIGNED_OUT') {
        // Limpar tudo no logout
        setOrganizations([])
        setCurrentOrganization(null)
        setCurrentMember(null)
        localStorage.removeItem('current_organization_id')
        setLoading(false)
      }
    })

    // Carregar organizações na montagem inicial
    loadOrganizations()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Verificar se é admin master (EXATAMENTE admin@admin.com)
      const isAdmin = user.email === 'admin@admin.com'

      let orgs: any[] = []

      if (isAdmin) {
        // Admin vê todas as organizações
        const { data: allOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })

        if (orgsError) throw orgsError
        orgs = allOrgs || []
      } else {
        // Passo 1: Buscar memberships do usuário atual
        const { data: userMemberships, error: memberError } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (memberError) {
          console.error('Erro ao buscar memberships:', memberError)
          throw memberError
        }

        if (userMemberships && userMemberships.length > 0) {
          // Passo 2: Buscar organizações onde o usuário é membro
          const memberOrgIds = userMemberships.map(m => m.organization_id)
          
          const { data: userOrgs, error: orgsError } = await supabase
            .from('organizations')
            .select('*')
            .in('id', memberOrgIds)
            .order('created_at', { ascending: false })

          if (orgsError) throw orgsError
          orgs = userOrgs || []
        }
      }

      setOrganizations(orgs)

      // Limpar cache se a org salva não estiver na lista
      const savedOrgId = localStorage.getItem('current_organization_id')
      if (savedOrgId && !orgs.find((o: Organization) => o.id === savedOrgId)) {
        localStorage.removeItem('current_organization_id')
      }

      // Se não houver organizações, criar uma padrão
      if (orgs.length === 0) {
        const newOrg = await createDefaultOrganization(user.id)
        if (newOrg) {
          setOrganizations([newOrg])
          setCurrentOrganization(newOrg)
          
          if (isAdmin) {
            // Admin sempre tem role owner virtual
            setCurrentMember({
              id: 'admin-virtual',
              organization_id: newOrg.id,
              user_id: user.id,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              invited_by: null,
              invited_at: null,
            } as OrganizationMember)
          } else {
            // Buscar membership
            const { data: memberData, error: memberError } = await supabase
              .from('organization_members')
              .select('*')
              .eq('organization_id', newOrg.id)
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (!memberError && memberData) {
              setCurrentMember(memberData)
            }
          }
        }
      } else {
        // Tentar recuperar org salva do localStorage
        const savedOrgId = localStorage.getItem('current_organization_id')
        
        // Verificar se a org salva está na lista de orgs do usuário
        let selectedOrg = savedOrgId 
          ? orgs.find((o: Organization) => o.id === savedOrgId) 
          : null
        
        // Se não encontrou ou não tinha salvo, usar a primeira da lista
        if (!selectedOrg && orgs.length > 0) {
          selectedOrg = orgs[0]
        }
        
        if (selectedOrg) {
          console.log('Organização selecionada:', selectedOrg.name, selectedOrg.id)
          setCurrentOrganization(selectedOrg)
          
          // Se for admin master, criar membership virtual com role owner
          if (isAdmin) {
            setCurrentMember({
              id: 'admin-virtual',
              organization_id: selectedOrg.id,
              user_id: user.id,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              invited_by: null,
              invited_at: null,
            } as OrganizationMember)
          } else {
            // Buscar membership da org atual
            const { data: memberData, error: memberError } = await supabase
              .from('organization_members')
              .select('*')
              .eq('organization_id', selectedOrg.id)
              .eq('user_id', user.id)
              .maybeSingle()
            
            console.log('Membership data:', memberData)
            
            if (!memberError && memberData) {
              setCurrentMember(memberData)
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar organizações:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDefaultOrganization = async (userId: string) => {
    try {
      // Buscar email do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const userEmail = user.email || 'user'
      const slug = `${userEmail.split('@')[0]}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

      // Criar organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: `${userEmail.split('@')[0]}'s Workspace`,
            slug,
            owner_id: userId,
          },
        ])
        .select()
        .single()

      if (orgError) {
        console.error('Erro ao criar organização:', orgError)
        
        // Se já existe uma org, buscar
        const { data: existingOrgs } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', userId)
          .limit(1)
        
        if (existingOrgs && existingOrgs.length > 0) {
          return existingOrgs[0] as Organization
        }
        
        throw orgError
      }

      // Adicionar usuário como owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([
          {
            organization_id: org.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
          },
        ])

      if (memberError) {
        console.error('Erro ao adicionar membro:', memberError)
        // Não falhar se o membro já existe, continuar
      }

      return org as Organization
    } catch (error) {
      console.error('Erro ao criar organização padrão:', error)
      return null
    }
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
      localStorage.setItem('current_organization_id', orgId)
      
      // Buscar membership
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const isAdmin = user.email === 'admin@admin.com'
          
          if (isAdmin) {
            // Admin sempre tem role owner virtual
            setCurrentMember({
              id: 'admin-virtual',
              organization_id: orgId,
              user_id: user.id,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              invited_by: null,
              invited_at: null,
            } as OrganizationMember)
          } else {
            supabase
              .from('organization_members')
              .select('*')
              .eq('organization_id', orgId)
              .eq('user_id', user.id)
              .maybeSingle()
              .then(({ data, error }) => {
                if (!error && data) {
                  setCurrentMember(data)
                }
              })
          }
        }
      })
    }
  }

  const refreshOrganizations = async () => {
    await loadOrganizations()
  }

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS.owner): boolean => {
    if (!currentMember) return false
    const role = currentMember.role as keyof typeof ROLE_PERMISSIONS
    return ROLE_PERMISSIONS[role]?.[permission] || false
  }

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        currentMember,
        loading,
        switchOrganization,
        refreshOrganizations,
        hasPermission,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

