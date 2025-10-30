import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Copy,
  Eye,
  Code,
  Settings as SettingsIcon,
  Check,
  Plus,
  X,
} from 'lucide-react'

interface AgentWidget {
  id: string
  widget_id: string
  widget_type: 'bubble' | 'full' | 'inline'
  primary_color: string
  position: string
  width: number
  height: number
  allowed_domains: string[]
  allow_all_domains: boolean
  total_impressions: number
  total_conversations: number
  is_active: boolean
}

export function AgentWidget() {
  const { id } = useParams()
  const [widget, setWidget] = useState<AgentWidget | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [copied, setCopied] = useState<'iframe' | 'js' | null>(null)

  useEffect(() => {
    loadWidget()
  }, [id])

  const loadWidget = async () => {
    try {
      // Check if widget exists
      const { data: existingWidget, error: fetchError } = await supabase
        .from('agent_widgets')
        .select('*')
        .eq('agent_id', id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existingWidget) {
        setWidget(existingWidget)
      } else {
        // Create default widget
        const widgetId = await generateWidgetId()
        const { data: newWidget, error: insertError } = await supabase
          .from('agent_widgets')
          .insert({
            agent_id: id,
            widget_id: widgetId,
          })
          .select()
          .single()

        if (insertError) throw insertError
        setWidget(newWidget)
      }
    } catch (error) {
      console.error('Error loading widget:', error)
      alert('Erro ao carregar widget')
    } finally {
      setLoading(false)
    }
  }

  const generateWidgetId = async () => {
    const { data, error } = await supabase.rpc('generate_widget_id')
    if (error) {
      return Math.random().toString(36).substring(2, 10)
    }
    return data
  }

  const handleSave = async () => {
    if (!widget) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('agent_widgets')
        .update({
          widget_type: widget.widget_type,
          primary_color: widget.primary_color,
          position: widget.position,
          width: widget.width,
          height: widget.height,
          allowed_domains: widget.allowed_domains,
          allow_all_domains: widget.allow_all_domains,
        })
        .eq('id', widget.id)

      if (error) throw error
      alert('✅ Widget atualizado com sucesso!')
    } catch (error) {
      console.error('Error saving widget:', error)
      alert('❌ Erro ao salvar widget')
    } finally {
      setSaving(false)
    }
  }

  const handleAddDomain = () => {
    if (!widget || !newDomain) return

    const domain = newDomain.trim().toLowerCase()
    if (!widget.allowed_domains.includes(domain)) {
      setWidget({
        ...widget,
        allowed_domains: [...widget.allowed_domains, domain],
      })
    }
    setNewDomain('')
  }

  const handleRemoveDomain = (domain: string) => {
    if (!widget) return
    setWidget({
      ...widget,
      allowed_domains: widget.allowed_domains.filter((d) => d !== domain),
    })
  }

  const copyToClipboard = (text: string, type: 'iframe' | 'js') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const getEmbedUrl = () => {
    return `${window.location.origin}/w/${widget?.widget_id}`
  }

  const getIframeCode = () => {
    if (!widget) return ''
    return `<iframe
  src="${getEmbedUrl()}"
  width="${widget.width}"
  height="${widget.height}"
  frameborder="0"
  allow="clipboard-write"
  style="border: none; border-radius: 16px;"
></iframe>`
  }

  const getJsCode = () => {
    if (!widget) return ''
    return `<script>
(function(){
  var s=document.createElement('script');
  s.src='${window.location.origin}/widget.js?id=${widget.widget_id}';
  s.async=true;
  document.body.appendChild(s);
})();
</script>`
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

  if (!widget) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Widget não encontrado</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/agents/${id}/edit`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Widget Incorporável
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure e incorpore o chat em seu site
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="space-y-6">
            {/* Visual Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Configurações Visuais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo do Widget</Label>
                  <select
                    value={widget.widget_type}
                    onChange={(e) => setWidget({ ...widget, widget_type: e.target.value as any })}
                    className="w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2"
                  >
                    <option value="bubble">Bubble Chat (canto da tela)</option>
                    <option value="full">Full Chat (largura total)</option>
                    <option value="inline">Inline (incorporado)</option>
                  </select>
                </div>

                <ColorPicker
                  label="Cor Principal"
                  value={widget.primary_color}
                  onChange={(color) => setWidget({ ...widget, primary_color: color })}
                />

                <div>
                  <Label>Posição</Label>
                  <select
                    value={widget.position}
                    onChange={(e) => setWidget({ ...widget, position: e.target.value })}
                    className="w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2"
                  >
                    <option value="bottom-right">Inferior Direito</option>
                    <option value="bottom-left">Inferior Esquerdo</option>
                    <option value="top-right">Superior Direito</option>
                    <option value="top-left">Superior Esquerdo</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Largura (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={widget.width}
                      onChange={(e) => setWidget({ ...widget, width: parseInt(e.target.value) })}
                      min="300"
                      max="800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Altura (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={widget.height}
                      onChange={(e) => setWidget({ ...widget, height: parseInt(e.target.value) })}
                      min="400"
                      max="900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Controle onde o widget pode ser usado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow-all"
                    checked={widget.allow_all_domains}
                    onChange={(e) => setWidget({ ...widget, allow_all_domains: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="allow-all" className="cursor-pointer">
                    Permitir em qualquer domínio
                  </Label>
                </div>

                {!widget.allow_all_domains && (
                  <>
                    <div>
                      <Label>Domínios Autorizados</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          placeholder="exemplo.com"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                        />
                        <Button onClick={handleAddDomain} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {widget.allowed_domains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <span className="text-sm">{domain}</span>
                          <button
                            onClick={() => handleRemoveDomain(domain)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {widget.allowed_domains.length === 0 && (
                        <p className="text-sm text-gray-500">Nenhum domínio autorizado</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Impressões:</span>
                  <span className="text-sm font-medium">{widget.total_impressions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Conversas:</span>
                  <span className="text-sm font-medium">{widget.total_conversations}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Embed Code */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-auto p-4">
                  <iframe
                    src={getEmbedUrl()}
                    width={widget.width}
                    height={widget.height}
                    frameBorder="0"
                    className="rounded-lg shadow-lg"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Iframe Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  HTML (Iframe)
                </CardTitle>
                <CardDescription>Cole este código no seu site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {getIframeCode()}
                  </pre>
                  <Button
                    onClick={() => copyToClipboard(getIframeCode(), 'iframe')}
                    className="absolute top-2 right-2"
                    size="sm"
                    variant="outline"
                  >
                    {copied === 'iframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* JS Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  JavaScript (Widget)
                </CardTitle>
                <CardDescription>Widget flutuante com bubble chat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {getJsCode()}
                  </pre>
                  <Button
                    onClick={() => copyToClipboard(getJsCode(), 'js')}
                    className="absolute top-2 right-2"
                    size="sm"
                    variant="outline"
                  >
                    {copied === 'js' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

