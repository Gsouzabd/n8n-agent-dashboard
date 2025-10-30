import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Building2, Users, Shield, Trash2, Edit, Plus, UserPlus, X, Save, ChevronDown, ChevronUp, UserCog } from 'lucide-react'
import { Organization, OrganizationMember } from '@/types/organization'

interface ExtendedOrganization extends Organization {
  members?: OrganizationMember[]
  memberCount?: number
}

export function AdminPanel() {
  const user = useAuthStore((state) => state.user)
  const [organizations, setOrganizations] = useState<ExtendedOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  
  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<ExtendedOrganization | null>(null)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    owner_email: '',
    plan_type: 'free',
    max_agents: 3,
    max_members: 1,
  })

  const [editForm, setEditForm] = useState<Partial<Organization>>({})
  const [memberForm, setMemberForm] = useState({
    email: '',
    role: 'member' as 'owner' | 'admin' | 'member' | 'viewer',
  })

  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user?.email !== 'admin@admin.com') {
      window.location.href = '/'
      return
    }
    loadOrganizations()
  }, [user])

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Carregar contagem de membros para cada organização
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('status', 'active')

          return { ...org, memberCount: count || 0 }
        })
      )

      setOrganizations(orgsWithCounts)
    } catch (error) {
      console.error('Error loading organizations:', error)
      alert('❌ Erro ao carregar organizações')
    } finally {
      setLoading(false)
    }
  }

  const loadOrgMembers = async (orgId: string) => {
    try {
      // Buscar membros
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')

      if (error) {
        console.error('Error loading members from DB:', error)
        throw error
      }

      console.log('Membros encontrados:', members)

      if (!members || members.length === 0) {
        // Atualizar com array vazio
        setOrganizations((prev) =>
          prev.map((org) =>
            org.id === orgId
              ? { ...org, members: [] }
              : org
          )
        )
        return
      }

      // Tentar buscar emails dos usuários via Edge Function
      let membersWithEmails = members.map((m: any) => ({
        ...m,
        user_email: 'Carregando...',
      }))

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const listResponse = await fetch(
            `${supabase.supabaseUrl}/functions/v1/admin-list-users`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          )

          if (listResponse.ok) {
            const listResult = await listResponse.json()
            console.log('Usuários encontrados via Edge Function:', listResult)
            
            // Mapear emails aos membros
            membersWithEmails = members.map((m: any) => {
              const user = listResult.success 
                ? listResult.users.find((u: any) => u.id === m.user_id)
                : null
              
              return {
                ...m,
                user_email: user?.email || `ID: ${m.user_id.substring(0, 8)}...`,
              }
            })
          } else {
            console.warn('Edge Function retornou erro:', await listResponse.text())
          }
        }
      } catch (emailError) {
        console.warn('Erro ao buscar emails, mas membros serão exibidos:', emailError)
        // Continuar mesmo se falhar a busca de emails
        membersWithEmails = members.map((m: any) => ({
          ...m,
          user_email: `User ID: ${m.user_id.substring(0, 8)}...`,
        }))
      }

      // Atualizar a organização com os membros
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? {
                ...org,
                members: membersWithEmails,
              }
            : org
        )
      )

      console.log('Membros atualizados com sucesso')
    } catch (error) {
      console.error('Error loading members:', error)
      alert(`❌ Erro ao carregar membros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const createOrganization = async () => {
    try {
      // Buscar user_id pelo email via Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Não autenticado')
      }

      const listResponse = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-list-users`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      const listResult = await listResponse.json()
      if (!listResponse.ok || !listResult.success) {
        throw new Error(listResult.error || 'Erro ao listar usuários')
      }

      const targetUser = listResult.users.find((u: any) => u.email === createForm.owner_email)

      if (!targetUser) {
        alert('⚠️ Usuário não encontrado. Crie o usuário primeiro usando "Criar Usuário".')
        return
      }

      const ownerId = targetUser.id

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: createForm.name,
            slug: createForm.slug,
            owner_id: ownerId,
            plan_type: createForm.plan_type,
            max_agents: createForm.max_agents,
            max_members: createForm.max_members,
          },
        ])
        .select()
        .single()

      if (orgError) throw orgError

      // Adicionar owner como membro
      await supabase.from('organization_members').insert([
        {
          organization_id: org.id,
          user_id: ownerId,
          role: 'owner',
          status: 'active',
        },
      ])

      alert('✅ Organização criada!')
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        slug: '',
        owner_email: '',
        plan_type: 'free',
        max_agents: 3,
        max_members: 1,
      })
      loadOrganizations()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      alert(`❌ Erro ao criar: ${error.message}`)
    }
  }

  const updateOrganization = async () => {
    if (!selectedOrg) return

    try {
      const { error } = await supabase
        .from('organizations')
        .update(editForm)
        .eq('id', selectedOrg.id)

      if (error) throw error

      alert('✅ Organização atualizada!')
      setShowEditModal(false)
      setEditForm({})
      setSelectedOrg(null)
      loadOrganizations()
    } catch (error: any) {
      console.error('Error updating organization:', error)
      alert(`❌ Erro ao atualizar: ${error.message}`)
    }
  }

  const deleteOrganization = async (orgId: string) => {
    if (!confirm('Tem certeza? Isso vai deletar TUDO da organização!')) return

    try {
      const { error } = await supabase.from('organizations').delete().eq('id', orgId)

      if (error) throw error
      alert('✅ Organização deletada!')
      loadOrganizations()
    } catch (error: any) {
      console.error('Error deleting organization:', error)
      alert(`❌ Erro ao deletar: ${error.message}`)
    }
  }

  const addMember = async () => {
    if (!selectedOrg) return

    try {
      // Buscar usuário pelo email via Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Não autenticado')
      }

      const listResponse = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-list-users`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      const listResult = await listResponse.json()
      if (!listResponse.ok || !listResult.success) {
        throw new Error(listResult.error || listResult.message || 'Erro ao listar usuários')
      }

      let targetUser = listResult.users.find((u: any) => u.email === memberForm.email)

      // Se não encontrou, criar o usuário
      if (!targetUser) {
        const shouldCreate = confirm(
          `⚠️ Usuário com email "${memberForm.email}" não encontrado.\n\n` +
          `Deseja criar este usuário automaticamente?\n\n` +
          `Uma senha temporária será gerada.`
        )

        if (!shouldCreate) {
          return
        }

        // Criar usuário com senha temporária
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`
        
        const createResponse = await fetch(
          `${supabase.supabaseUrl}/functions/v1/admin-create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: memberForm.email,
              password: tempPassword,
              autoConfirm: true,
            }),
          }
        )

        const createResult = await createResponse.json()

        if (!createResponse.ok || !createResult.success) {
          throw new Error(createResult.error || createResult.message || 'Erro ao criar usuário')
        }

        targetUser = createResult.user

        alert(
          `✅ Usuário criado com sucesso!\n\n` +
          `Email: ${memberForm.email}\n` +
          `Senha temporária: ${tempPassword}\n\n` +
          `⚠️ IMPORTANTE: Copie esta senha e envie para o usuário.\n` +
          `O usuário deve alterá-la no primeiro login.`
        )
      }

      // Adicionar membro à organização
      const { error } = await supabase.from('organization_members').insert([
        {
          organization_id: selectedOrg.id,
          user_id: targetUser.id,
          role: memberForm.role,
          status: 'active',
          invited_by: user?.id,
        },
      ])

      if (error) throw error

      alert('✅ Membro adicionado à organização!')
      setShowAddMemberModal(false)
      setMemberForm({ email: '', role: 'member' })
      loadOrgMembers(selectedOrg.id)
      loadOrganizations()
    } catch (error: any) {
      console.error('Error adding member:', error)
      alert(`❌ Erro ao adicionar: ${error.message}`)
    }
  }

  const updateMemberRole = async (memberId: string, orgId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      alert('✅ Role atualizado!')
      loadOrgMembers(orgId)
    } catch (error: any) {
      console.error('Error updating role:', error)
      alert(`❌ Erro ao atualizar: ${error.message}`)
    }
  }

  const removeMember = async (memberId: string, orgId: string) => {
    if (!confirm('Remover este membro?')) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      alert('✅ Membro removido!')
      loadOrgMembers(orgId)
      loadOrganizations()
    } catch (error: any) {
      console.error('Error removing member:', error)
      alert(`❌ Erro ao remover: ${error.message}`)
    }
  }

  const toggleOrgExpanded = async (orgId: string) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
    } else {
      setExpandedOrg(orgId)
      await loadOrgMembers(orgId)
    }
  }

  const createUser = async () => {
    try {
      // Validações
      if (!createUserForm.email || !createUserForm.password) {
        alert('❌ Preencha todos os campos')
        return
      }

      if (createUserForm.password !== createUserForm.confirmPassword) {
        alert('❌ As senhas não coincidem')
        return
      }

      if (createUserForm.password.length < 6) {
        alert('❌ A senha deve ter pelo menos 6 caracteres')
        return
      }

      // Criar usuário via Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Não autenticado')
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: createUserForm.email,
            password: createUserForm.password,
            autoConfirm: true,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Erro ao criar usuário')
      }

      alert(
        `✅ Usuário criado com sucesso!\n\n` +
        `Email: ${createUserForm.email}\n` +
        `O usuário já pode fazer login com a senha definida.`
      )

      setShowCreateUserModal(false)
      setCreateUserForm({ email: '', password: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(`❌ Erro ao criar usuário: ${error.message}`)
    }
  }

  if (!user || user.email !== 'admin@admin.com') {
    return <div>Access Denied</div>
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
              🛡️ Painel de Administração Master
            </h1>
            <p className="text-muted-foreground mt-2">Acesso Master - {user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateUserModal(true)}>
              <UserCog className="h-4 w-4 mr-2" />
              Criar Usuário
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Organização
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Organizações</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{organizations.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plano Free</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {organizations.filter((o) => o.plan_type === 'free').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plano Pro</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {organizations.filter((o) => o.plan_type === 'pro').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Membros</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {organizations.reduce((sum, org) => sum + (org.memberCount || 0), 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Organizações</CardTitle>
            <CardDescription>Gerenciar organizações e membros do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Organization Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-3 flex-1">
                      <Building2 className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{org.name}</p>
                        <p className="text-xs text-gray-500">
                          {org.slug} • {org.memberCount} membros • {org.max_agents} agentes máx
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          org.plan_type === 'enterprise'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                            : org.plan_type === 'pro'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {org.plan_type}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org)
                          setShowAddMemberModal(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 text-green-500" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org)
                          setEditForm(org)
                          setShowEditModal(true)
                        }}
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => deleteOrganization(org.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrgExpanded(org.id)}
                      >
                        {expandedOrg === org.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Members List (Expanded) */}
                  {expandedOrg === org.id && (
                    <div className="p-4 space-y-2 bg-white dark:bg-gray-950">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Membros da Organização
                      </p>
                      {org.members && org.members.length > 0 ? (
                        org.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{member.user_email}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  updateMemberRole(member.id, org.id, e.target.value)
                                }
                                className="text-xs px-2 py-1 border rounded dark:bg-gray-900 dark:border-gray-700"
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>

                              {member.role !== 'owner' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMember(member.id, org.id)}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-4">
                          Nenhum membro encontrado
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {organizations.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma organização ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Criar Organização */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Nova Organização</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Minha Empresa"
                />
              </div>

              <div>
                <Label>Slug (URL amigável)</Label>
                <Input
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="minha-empresa"
                />
              </div>

              <div>
                <Label>Email do Owner</Label>
                <Input
                  type="email"
                  value={createForm.owner_email}
                  onChange={(e) => setCreateForm({ ...createForm, owner_email: e.target.value })}
                  placeholder="owner@empresa.com"
                />
              </div>

              <div>
                <Label>Plano</Label>
                <select
                  value={createForm.plan_type}
                  onChange={(e) => setCreateForm({ ...createForm, plan_type: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Máx Agentes</Label>
                  <Input
                    type="number"
                    value={createForm.max_agents}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, max_agents: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Máx Membros</Label>
                  <Input
                    type="number"
                    value={createForm.max_members}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, max_members: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createOrganization}>
                <Save className="h-4 w-4 mr-2" />
                Criar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Organização */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Editar Organização</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Slug</Label>
                <Input
                  value={editForm.slug || ''}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                />
              </div>

              <div>
                <Label>Plano</Label>
                <select
                  value={editForm.plan_type || 'free'}
                  onChange={(e) => setEditForm({ ...editForm, plan_type: e.target.value as any })}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Máx Agentes</Label>
                  <Input
                    type="number"
                    value={editForm.max_agents || 3}
                    onChange={(e) =>
                      setEditForm({ ...editForm, max_agents: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Máx Membros</Label>
                  <Input
                    type="number"
                    value={editForm.max_members || 1}
                    onChange={(e) =>
                      setEditForm({ ...editForm, max_members: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={updateOrganization}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Membro */}
      {showAddMemberModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Adicionar Membro</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddMemberModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Organização: <strong>{selectedOrg.name}</strong>
            </p>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                💡 <strong>Dica:</strong> Se o usuário não existir, você pode criá-lo automaticamente!
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Email do Usuário</Label>
                <Input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                />
              </div>

              <div>
                <Label>Role</Label>
                <select
                  value={memberForm.role}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, role: e.target.value as any })
                  }
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddMemberModal(false)}>
                Cancelar
              </Button>
              <Button onClick={addMember}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Usuário */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Criar Novo Usuário</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateUserModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Crie um novo usuário no sistema. Ele poderá fazer login imediatamente.
            </p>

            <div className="space-y-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) =>
                    setCreateUserForm({ ...createUserForm, email: e.target.value })
                  }
                  placeholder="usuario@exemplo.com"
                />
              </div>

              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) =>
                    setCreateUserForm({ ...createUserForm, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <Label>Confirmar Senha</Label>
                <Input
                  type="password"
                  value={createUserForm.confirmPassword}
                  onChange={(e) =>
                    setCreateUserForm({ ...createUserForm, confirmPassword: e.target.value })
                  }
                  placeholder="Digite a senha novamente"
                />
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md text-sm">
              <p className="text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Importante:</strong> Anote a senha e envie para o usuário de forma segura.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreateUserModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createUser}>
                <UserCog className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

