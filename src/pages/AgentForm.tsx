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
import { ArrowLeft, Save, Code } from 'lucide-react'
import { Link } from 'react-router-dom'

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

