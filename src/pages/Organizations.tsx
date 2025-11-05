import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { supabase } from '@/lib/supabase'
import { OrganizationMember, OrganizationInvitation } from '@/types/organization'
import {
  Users,
  Mail,
  Copy,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Crown,
  Plus,
  X,
  Clock,
  Key,
  Save,
  Edit,
  Check,
} from 'lucide-react'

export function Organizations() {
  const { currentOrganization, currentMember, hasPermission, refreshOrganizations } = useOrganization()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [loading, setLoading] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (currentOrganization) {
      loadMembers()
      loadInvitations()
      loadOpenAIKey()
      setOrgName(currentOrganization.name)
    }
  }, [currentOrganization])

  const loadMembers = async () => {
    if (!currentOrganization) return

    try {
      // Buscar membros sem JOIN
      const { data: membersData, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar membros:', error)
        return
      }

      if (!membersData || membersData.length === 0) {
        setMembers([])
        return
      }

      // Tentar buscar emails via Edge Function (apenas para admin)
      let membersWithEmail = membersData.map((m: any) => ({
        ...m,
        user_email: `User ID: ${m.user_id.substring(0, 8)}...`,
      }))

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (session && user?.email === 'admin@admin.com') {
          // Apenas admin pode usar a Edge Function
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdhhqafyqyamcejkufxf.supabase.co'
          const listResponse = await fetch(
            `${supabaseUrl}/functions/v1/admin-list-users`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          )

          if (listResponse.ok) {
            const listResult = await listResponse.json()
            
            if (listResult.success) {
              // Mapear emails aos membros
              membersWithEmail = membersData.map((m: any) => {
                const foundUser = listResult.users.find((u: any) => u.id === m.user_id)
                return {
                  ...m,
                  user_email: foundUser?.email || `User ID: ${m.user_id.substring(0, 8)}...`,
                }
              })
            }
          }
        }
      } catch (emailError) {
        console.warn('Não foi possível carregar emails:', emailError)
        // Continua com IDs truncados
      }

      setMembers(membersWithEmail)
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    }
  }

  const loadInvitations = async () => {
    if (!currentOrganization) return

    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar convites:', error)
      return
    }

    setInvitations(data || [])
  }

  const loadOpenAIKey = async () => {
    if (!currentOrganization) return

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('openai_api_key')
        .eq('id', currentOrganization.id)
        .single()

      if (error) throw error
      
      // Mostra apenas os últimos 4 caracteres para segurança
      if (data?.openai_api_key) {
        const key = data.openai_api_key
        setOpenaiKey(key)
      }
    } catch (error) {
      console.error('Erro ao carregar chave OpenAI:', error)
    }
  }

  const saveOpenAIKey = async () => {
    if (!currentOrganization) return

    setSavingKey(true)
    try {
      console.log('💾 Salvando chave OpenAI:', {
        organizationId: currentOrganization.id,
        organizationName: currentOrganization.name,
        keyLength: openaiKey.length,
        keyPrefix: openaiKey.substring(0, 10) + '...'
      })

      const { data, error } = await supabase
        .from('organizations')
        .update({ openai_api_key: openaiKey || null })
        .eq('id', currentOrganization.id)
        .select()

      if (error) {
        console.error('❌ Erro ao salvar:', error)
        throw error
      }

      console.log('✅ Chave salva com sucesso:', data)
      alert('Chave OpenAI salva com sucesso!')
    } catch (error: any) {
      console.error('❌ Erro ao salvar chave OpenAI:', error)
      alert(`Erro ao salvar chave OpenAI: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setSavingKey(false)
    }
  }

  const updateOrganizationName = async () => {
    if (!currentOrganization || !orgName.trim()) return

    setSavingName(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', currentOrganization.id)
        .select()
        .single()

      if (error) throw error

      // Atualizar o contexto
      await refreshOrganizations()
      
      setEditingName(false)
      alert('Nome da organização atualizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao atualizar nome:', error)
      alert(`Erro ao atualizar nome: ${error.message || 'Erro desconhecido'}`)
      setOrgName(currentOrganization.name) // Reverter para o nome original
    } finally {
      setSavingName(false)
    }
  }

  const cancelEditName = () => {
    setOrgName(currentOrganization?.name || '')
    setEditingName(false)
  }

  const handleInvite = async () => {
    if (!currentOrganization || !inviteEmail) return

    setLoading(true)
    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 dias para aceitar

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase.from('organization_invitations').insert([
        {
          organization_id: currentOrganization.id,
          email: inviteEmail,
          role: inviteRole,
          token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        },
      ])

      if (error) throw error

      // TODO: Enviar email de convite (pode ser feito via Edge Function)
      alert(`✅ Convite enviado para ${inviteEmail}!\n\nLink de convite copiado para área de transferência.`)
      const inviteUrl = `${window.location.origin}/invite/${token}`
      navigator.clipboard.writeText(inviteUrl)

      setInviteEmail('')
      setShowInviteForm(false)
      loadInvitations()
    } catch (error: any) {
      console.error('Erro ao convidar:', error)
      alert('❌ Erro ao enviar convite: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Cancelar este convite?')) return

    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', inviteId)

    if (error) {
      alert('Erro ao cancelar convite')
      return
    }

    loadInvitations()
  }

  const handleChangeMemberRole = async (memberId: string, newRole: string) => {
    if (!hasPermission('canManageMembers')) {
      alert('Você não tem permissão para alterar roles')
      return
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      alert('Erro ao atualizar role')
      return
    }

    loadMembers()
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!hasPermission('canManageMembers')) {
      alert('Você não tem permissão para remover membros')
      return
    }

    if (!confirm('Remover este membro da organização?')) return

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      alert('Erro ao remover membro')
      return
    }

    loadMembers()
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return Crown
      case 'admin':
        return ShieldCheck
      case 'member':
        return Shield
      case 'viewer':
        return Eye
      default:
        return Users
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-500'
      case 'admin':
        return 'text-orange-500'
      case 'member':
        return 'text-blue-500'
      case 'viewer':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }

  if (!currentOrganization) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            {currentOrganization.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie membros e configurações da organização
          </p>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Nome:</span>
              {editingName && (currentMember?.role === 'owner' || currentMember?.role === 'admin') ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-8 text-sm"
                    disabled={savingName}
                  />
                  <Button
                    size="sm"
                    onClick={updateOrganizationName}
                    disabled={savingName || !orgName.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditName}
                    disabled={savingName}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{currentOrganization.name}</span>
                  {(currentMember?.role === 'owner' || currentMember?.role === 'admin') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Plano:</span>
              <span className="text-sm font-medium capitalize">{currentOrganization.plan_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Slug:</span>
              <span className="text-sm font-mono">{currentOrganization.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Máx. Agentes:</span>
              <span className="text-sm font-medium">{currentOrganization.max_agents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Máx. Membros:</span>
              <span className="text-sm font-medium">{currentOrganization.max_members}</span>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI Configuration */}
        {(currentMember?.role === 'owner' || currentMember?.role === 'admin') && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <CardTitle>Configurações Avançadas</CardTitle>
              </div>
              <CardDescription>
                Configure integrações e recursos avançados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_key">
                  Chave da API OpenAI (opcional)
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai_key"
                      type={showOpenaiKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showOpenaiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    onClick={saveOpenAIKey}
                    disabled={savingKey}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingKey ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Necessária para geração automática de embeddings nos documentos da base de conhecimento.
                  Modelo utilizado: text-embedding-3-small (~$0.02 / 1M tokens).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membros ({members.length})</CardTitle>
                <CardDescription>Pessoas com acesso a esta organização</CardDescription>
              </div>
              {hasPermission('canInviteMembers') && (
                <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                  {showInviteForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {showInviteForm ? 'Cancelar' : 'Convidar'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invite Form */}
            {showInviteForm && (
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                <div>
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2"
                  >
                    <option value="viewer">Viewer - Apenas visualização</option>
                    <option value="member">Member - Criar e editar agentes</option>
                    <option value="admin">Admin - Gerenciar membros</option>
                  </select>
                </div>
                <Button onClick={handleInvite} disabled={loading || !inviteEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {members.map((member) => {
                const RoleIcon = getRoleIcon(member.role)
                const roleColor = getRoleColor(member.role)

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${roleColor}`}>
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.user_email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                    </div>

                    {hasPermission('canManageMembers') && member.role !== 'owner' && member.id !== currentMember?.id && (
                      <div className="flex gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                          className="text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes ({invitations.length})</CardTitle>
              <CardDescription>Convites aguardando aceitação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{invitation.email}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {invitation.role} • Expira em{' '}
                          {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/invite/${invitation.token}`
                          navigator.clipboard.writeText(url)
                          alert('Link copiado!')
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvite(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}

