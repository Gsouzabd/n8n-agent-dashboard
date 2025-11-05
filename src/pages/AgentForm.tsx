import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Layout } from '@/components/Layout'
import { ArrowLeft, Save, Code, Edit, Trash2, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { handoffService } from '@/services/handoffService'
import { AgentHandoffTrigger } from '@/types'

const agentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  webhook_url: z.string().url('URL inválida').optional().or(z.literal('')),
  webhook_method: z.string().default('POST'),
  webhook_path: z.string().optional(),
  auth_type: z.string().default('none'),
  auth_username: z.string().optional(),
  auth_password: z.string().optional(),
})

type AgentFormData = z.infer<typeof agentSchema>

export function AgentForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { currentOrganization } = useOrganization()
  const [loading, setLoading] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'webhook' | 'handoff'>('basic')
  const [handoffEnabled, setHandoffEnabled] = useState(false)
  const [triggers, setTriggers] = useState<AgentHandoffTrigger[]>([])
  const [editingTrigger, setEditingTrigger] = useState<AgentHandoffTrigger | null>(null)
  const [triggerForm, setTriggerForm] = useState({
    trigger_type: 'keyword' as 'keyword' | 'attempts' | 'sentiment',
    value: '',
    matching_type: 'exact' as 'exact' | 'partial' | 'case_insensitive' | undefined,
  })
  const [loadingHandoff, setLoadingHandoff] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      webhook_method: 'POST',
      auth_type: 'none',
    },
  })

  const formValues = watch()

  useEffect(() => {
    if (isEditing) {
      loadAgent()
      loadHandoffConfig()
    }
  }, [id])

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      reset(data)
    } catch (error) {
      console.error('Erro ao carregar agente:', error)
      alert('Erro ao carregar agente')
      navigate('/')
    }
  }

  const loadHandoffConfig = async () => {
    if (!id) return
    
    try {
      setLoadingHandoff(true)
      const config = await handoffService.getHandoffConfig(id)
      const triggersList = await handoffService.getTriggers(id)
      
      setHandoffEnabled(config?.enabled || false)
      setTriggers(triggersList)
    } catch (error) {
      console.error('Erro ao carregar configuração de handoff:', error)
    } finally {
      setLoadingHandoff(false)
    }
  }

  const handleSaveHandoffEnabled = async (enabled: boolean) => {
    if (!id) return
    
    try {
      setLoadingHandoff(true)
      await handoffService.saveHandoffConfig(id, enabled)
      setHandoffEnabled(enabled)
    } catch (error: any) {
      console.error('Erro ao salvar configuração de handoff:', error)
      alert('Erro ao salvar configuração: ' + error.message)
    } finally {
      setLoadingHandoff(false)
    }
  }

  const handleSaveTrigger = async () => {
    if (!id || !triggerForm.value.trim()) {
      alert('Preencha o valor do gatilho')
      return
    }

    // Validação para attempts: deve ser número
    if (triggerForm.trigger_type === 'attempts') {
      const numValue = parseInt(triggerForm.value)
      if (isNaN(numValue) || numValue < 1) {
        alert('Número de tentativas deve ser um número positivo')
        return
      }
    }

    try {
      setLoadingHandoff(true)
      const triggerData: Partial<AgentHandoffTrigger> = {
        ...(editingTrigger ? { id: editingTrigger.id } : {}),
        agent_id: id,
        trigger_type: triggerForm.trigger_type,
        value: triggerForm.value,
        matching_type: triggerForm.trigger_type === 'keyword' ? triggerForm.matching_type : undefined,
      }

      await handoffService.saveTrigger(triggerData)
      
      // Recarregar lista de gatilhos
      const updatedTriggers = await handoffService.getTriggers(id)
      setTriggers(updatedTriggers)
      
      // Limpar formulário
      setTriggerForm({
        trigger_type: 'keyword',
        value: '',
        matching_type: 'exact',
      })
      setEditingTrigger(null)
    } catch (error: any) {
      console.error('Erro ao salvar gatilho:', error)
      alert('Erro ao salvar gatilho: ' + error.message)
    } finally {
      setLoadingHandoff(false)
    }
  }

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este gatilho?')) return
    if (!id) return

    try {
      setLoadingHandoff(true)
      await handoffService.deleteTrigger(triggerId)
      const updatedTriggers = await handoffService.getTriggers(id)
      setTriggers(updatedTriggers)
    } catch (error: any) {
      console.error('Erro ao excluir gatilho:', error)
      alert('Erro ao excluir gatilho: ' + error.message)
    } finally {
      setLoadingHandoff(false)
    }
  }

  const handleToggleTriggerStatus = async (triggerId: string, currentStatus: boolean) => {
    if (!id) return

    try {
      setLoadingHandoff(true)
      await handoffService.toggleTriggerStatus(triggerId, !currentStatus)
      const updatedTriggers = await handoffService.getTriggers(id)
      setTriggers(updatedTriggers)
    } catch (error: any) {
      console.error('Erro ao alterar status do gatilho:', error)
      alert('Erro ao alterar status: ' + error.message)
    } finally {
      setLoadingHandoff(false)
    }
  }

  const handleEditTrigger = (trigger: AgentHandoffTrigger) => {
    setEditingTrigger(trigger)
    setTriggerForm({
      trigger_type: trigger.trigger_type,
      value: trigger.value,
      matching_type: trigger.matching_type || 'exact',
    })
  }

  const handleCancelEdit = () => {
    setEditingTrigger(null)
    setTriggerForm({
      trigger_type: 'keyword',
      value: '',
      matching_type: 'exact',
    })
  }

  const onSubmit = async (data: AgentFormData) => {
    if (!user) return
    
    if (!currentOrganization) {
      alert('Nenhuma organização selecionada. Por favor, selecione uma organização.')
      return
    }
    
    setLoading(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('agents')
          .update(data)
          .eq('id', id)

        if (error) throw error
        alert('Agente atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('agents')
          .insert([{ 
            ...data, 
            user_id: user.id,
            organization_id: currentOrganization.id 
          }])

        if (error) throw error
        alert('Agente criado com sucesso!')
      }
      navigate('/')
    } catch (error: any) {
      console.error('Erro ao salvar agente:', error)
      alert('Erro ao salvar agente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateJson = () => {
    const baseUrl = supabase.supabaseUrl
    return {
      webhook: {
        url: formValues.webhook_url || '',
        method: formValues.webhook_method || 'POST',
        authentication: {
          type: formValues.auth_type || 'none',
          username: formValues.auth_username || '',
          password: formValues.auth_password || '',
        },
      },
      agent: {
        id: id || 'new-agent',
        configEndpoint: `${baseUrl}/functions/v1/agent-config/${id || 'agent-id'}`,
        queryEndpoint: `${baseUrl}/functions/v1/agent-query`,
        apiKey: '[SUA_ANON_KEY]',
      },
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Editar Agente' : 'Novo Agente'}
            </h1>
            {!isEditing && currentOrganization && (
              <p className="text-sm text-muted-foreground mt-1">
                Criando na organização: <span className="font-medium text-foreground">{currentOrganization.name}</span>
              </p>
            )}
          </div>
          {isEditing && (
            <Button variant="outline" onClick={() => setShowJson(!showJson)}>
              <Code className="h-4 w-4 mr-2" />
              {showJson ? 'Ocultar' : 'Ver'} JSON
            </Button>
          )}
        </div>

        {showJson && isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Configuração para n8n</CardTitle>
              <CardDescription>
                Use este JSON para configurar o agente no n8n
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(generateJson(), null, 2)}
              </pre>
              <Button
                className="mt-4"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(generateJson(), null, 2))
                  alert('JSON copiado para a área de transferência!')
                }}
              >
                Copiar JSON
              </Button>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                Informações Básicas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('webhook')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'webhook'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                Webhook n8n
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('handoff')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'handoff'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                Handoff
              </button>
            </nav>
          </div>

          {/* Tab: Informações Básicas */}
          {activeTab === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure as informações básicas do seu agente
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Agente *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Assistente de Vendas"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito e funcionalidades do agente"
                  rows={3}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="Instruções e comportamento do agente. Ex: Você é um assistente especializado em vendas..."
                  rows={5}
                  {...register('system_prompt')}
                />
                <p className="text-xs text-muted-foreground">
                  Define como o agente deve se comportar e responder
                </p>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Tab: Webhook */}
          {activeTab === 'webhook' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Webhook n8n</CardTitle>
                <CardDescription>
                  Configure o webhook para integração com o n8n
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://gsouzabd.app.n8n.cloud/webhook/agent-name"
                  {...register('webhook_url')}
                />
                {errors.webhook_url && (
                  <p className="text-sm text-destructive">{errors.webhook_url.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook_method">Método HTTP</Label>
                  <select
                    id="webhook_method"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('webhook_method')}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_path">Path</Label>
                  <Input
                    id="webhook_path"
                    placeholder="agent-name"
                    {...register('webhook_path')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_type">Tipo de Autenticação</Label>
                <select
                  id="auth_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('auth_type')}
                >
                  <option value="none">Nenhuma</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                </select>
              </div>

              {formValues.auth_type === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auth_username">Usuário</Label>
                    <Input
                      id="auth_username"
                      placeholder="username"
                      {...register('auth_username')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth_password">Senha</Label>
                    <Input
                      id="auth_password"
                      type="password"
                      placeholder="password"
                      {...register('auth_password')}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Tab: Handoff */}
          {activeTab === 'handoff' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Handoff</CardTitle>
                <CardDescription>
                  Configure quando o agente deve transferir a conversa para um humano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Handoff */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Ativar Handoff</h3>
                    <p className="text-sm text-muted-foreground">
                      Permite que o agente transfira conversas para humanos baseado em gatilhos
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoffEnabled}
                      onChange={(e) => handleSaveHandoffEnabled(e.target.checked)}
                      disabled={loadingHandoff || !isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {!isEditing && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Salve o agente primeiro para configurar os gatilhos de handoff.
                    </p>
                  </div>
                )}

                {isEditing && (
                  <>
                    {/* Triggers List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Gatilhos de Handoff</h3>
                      </div>

                      {triggers.length === 0 && !editingTrigger && (
                        <p className="text-sm text-muted-foreground py-4">
                          Nenhum gatilho configurado. Adicione um gatilho abaixo.
                        </p>
                      )}

                      <div className="space-y-2">
                        {triggers.map((trigger) => (
                          <div
                            key={trigger.id}
                            className={`flex items-center justify-between p-4 border rounded-lg ${
                              !trigger.is_active ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {trigger.trigger_type === 'keyword' && 'Palavra-chave'}
                                  {trigger.trigger_type === 'attempts' && 'Número de tentativas'}
                                  {trigger.trigger_type === 'sentiment' && 'Sentiment negativo'}
                                </span>
                                {!trigger.is_active && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Valor: <span className="font-mono">{trigger.value}</span>
                                {trigger.matching_type && (
                                  <> | Tipo: {trigger.matching_type === 'exact' ? 'Exato' : trigger.matching_type === 'partial' ? 'Parcial' : 'Case-insensitive'}</>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTrigger(trigger)}
                                disabled={loadingHandoff}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleTriggerStatus(trigger.id, trigger.is_active)}
                                disabled={loadingHandoff}
                              >
                                {trigger.is_active ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTrigger(trigger.id)}
                                disabled={loadingHandoff}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add/Edit Trigger Form */}
                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-4">
                        {editingTrigger ? 'Editar Gatilho' : 'Adicionar Novo Gatilho'}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="trigger_type">Tipo de Gatilho</Label>
                          <select
                            id="trigger_type"
                            value={triggerForm.trigger_type}
                            onChange={(e) => {
                              setTriggerForm({
                                ...triggerForm,
                                trigger_type: e.target.value as 'keyword' | 'attempts' | 'sentiment',
                                matching_type: e.target.value === 'keyword' ? triggerForm.matching_type : undefined,
                              })
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="keyword">Palavra-chave</option>
                            <option value="attempts">Número de tentativas</option>
                            <option value="sentiment">Sentiment negativo</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="trigger_value">
                            {triggerForm.trigger_type === 'keyword' && 'Palavra-chave'}
                            {triggerForm.trigger_type === 'attempts' && 'Número de tentativas'}
                            {triggerForm.trigger_type === 'sentiment' && 'Valor do threshold'}
                          </Label>
                          <Input
                            id="trigger_value"
                            type={triggerForm.trigger_type === 'attempts' ? 'number' : 'text'}
                            placeholder={
                              triggerForm.trigger_type === 'keyword'
                                ? 'Ex: cancelar, reembolso'
                                : triggerForm.trigger_type === 'attempts'
                                ? 'Ex: 3'
                                : 'Ex: 0.7'
                            }
                            value={triggerForm.value}
                            onChange={(e) => setTriggerForm({ ...triggerForm, value: e.target.value })}
                          />
                        </div>

                        {triggerForm.trigger_type === 'keyword' && (
                          <div className="space-y-2">
                            <Label htmlFor="matching_type">Tipo de Correspondência</Label>
                            <select
                              id="matching_type"
                              value={triggerForm.matching_type || 'exact'}
                              onChange={(e) =>
                                setTriggerForm({
                                  ...triggerForm,
                                  matching_type: e.target.value as 'exact' | 'partial' | 'case_insensitive',
                                })
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="exact">Exato</option>
                              <option value="partial">Parcial</option>
                              <option value="case_insensitive">Case-insensitive</option>
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleSaveTrigger}
                            disabled={loadingHandoff || !triggerForm.value.trim()}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {editingTrigger ? 'Atualizar' : 'Adicionar'} Gatilho
                          </Button>
                          {editingTrigger && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={loadingHandoff}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Agente'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

