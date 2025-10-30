import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useTheme } from '@/contexts/ThemeContext'
import { GOOGLE_FONTS } from '@/types/theme'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Upload,
  Download,
  RotateCcw,
  Save,
  Moon,
  Sun,
  Code,
  Palette,
  Type,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Check,
} from 'lucide-react'

export function ThemeSettings() {
  const { theme, updateTheme, resetTheme, exportTheme, importTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState<'horizontal' | 'vertical' | 'favicon' | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTheme(theme)
      alert('✅ Tema salvo com sucesso!')
    } catch (error) {
      alert('❌ Erro ao salvar tema')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = () => {
    const json = exportTheme()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    try {
      await importTheme(importJson)
      setShowImport(false)
      setImportJson('')
      alert('✅ Tema importado com sucesso!')
    } catch (error) {
      alert('❌ Erro ao importar tema: JSON inválido')
    }
  }

  const handleLogoUpload = async (type: 'horizontal' | 'vertical' | 'favicon', file: File) => {
    setUploadingLogo(type)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      const field = type === 'horizontal' ? 'logo_url' : type === 'vertical' ? 'logo_vertical_url' : 'favicon_url'
      await updateTheme({ [field]: publicUrl })

      alert('✅ Logo enviado com sucesso!')
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('❌ Erro ao enviar logo')
    } finally {
      setUploadingLogo(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Personalização de Tema
            </h1>
            <p className="text-muted-foreground mt-2">
              Customize a aparência completa do seu dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setShowImport(!showImport)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" onClick={resetTheme}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Import Dialog */}
        {showImport && (
          <Card>
            <CardHeader>
              <CardTitle>Importar Tema</CardTitle>
              <CardDescription>Cole o JSON do tema exportado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"brand_name": "My Brand", ...}'
                rows={10}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleImport}>
                  <Check className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                <Button variant="outline" onClick={() => setShowImport(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Identidade Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="brand-name">Nome da Marca</Label>
                  <Input
                    id="brand-name"
                    value={theme.brand_name}
                    onChange={(e) => updateTheme({ brand_name: e.target.value })}
                    placeholder="AI Dashboard"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Logo Horizontal</Label>
                    <div className="mt-2">
                      {theme.logo_url && (
                        <img
                          src={theme.logo_url}
                          alt="Logo"
                          className="w-full h-16 object-contain border border-gray-200 dark:border-gray-800 rounded-lg mb-2"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {uploadingLogo === 'horizontal' ? 'Enviando...' : 'Upload'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload('horizontal', file)
                          }}
                          disabled={uploadingLogo === 'horizontal'}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Logo Vertical</Label>
                    <div className="mt-2">
                      {theme.logo_vertical_url && (
                        <img
                          src={theme.logo_vertical_url}
                          alt="Logo Vertical"
                          className="w-full h-16 object-contain border border-gray-200 dark:border-gray-800 rounded-lg mb-2"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {uploadingLogo === 'vertical' ? 'Enviando...' : 'Upload'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload('vertical', file)
                          }}
                          disabled={uploadingLogo === 'vertical'}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Favicon</Label>
                    <div className="mt-2">
                      {theme.favicon_url && (
                        <img
                          src={theme.favicon_url}
                          alt="Favicon"
                          className="w-16 h-16 object-contain border border-gray-200 dark:border-gray-800 rounded-lg mb-2 mx-auto"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {uploadingLogo === 'favicon' ? 'Enviando...' : 'Upload'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload('favicon', file)
                          }}
                          disabled={uploadingLogo === 'favicon'}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Cores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <ColorPicker
                    label="Cor Primária"
                    value={theme.primary_color}
                    onChange={(color) => updateTheme({ primary_color: color })}
                  />
                  <ColorPicker
                    label="Cor Secundária"
                    value={theme.secondary_color}
                    onChange={(color) => updateTheme({ secondary_color: color })}
                  />
                  <ColorPicker
                    label="Sucesso"
                    value={theme.success_color}
                    onChange={(color) => updateTheme({ success_color: color })}
                  />
                  <ColorPicker
                    label="Erro"
                    value={theme.error_color}
                    onChange={(color) => updateTheme({ error_color: color })}
                  />
                  <ColorPicker
                    label="Aviso"
                    value={theme.warning_color}
                    onChange={(color) => updateTheme({ warning_color: color })}
                  />
                  <ColorPicker
                    label="Info"
                    value={theme.info_color}
                    onChange={(color) => updateTheme({ info_color: color })}
                  />
                  <ColorPicker
                    label="Fundo"
                    value={theme.background_color}
                    onChange={(color) => updateTheme({ background_color: color })}
                  />
                  <ColorPicker
                    label="Texto"
                    value={theme.text_color}
                    onChange={(color) => updateTheme({ text_color: color })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Tipografia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="font-family">Fonte do Google Fonts</Label>
                  <select
                    id="font-family"
                    value={theme.font_family}
                    onChange={(e) => updateTheme({ font_family: e.target.value })}
                    className="w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2"
                  >
                    {GOOGLE_FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="font-size">Tamanho Base da Fonte: {theme.font_size_base}px</Label>
                  <input
                    id="font-size"
                    type="range"
                    min="12"
                    max="20"
                    value={theme.font_size_base}
                    onChange={(e) => updateTheme({ font_size_base: parseInt(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Layout */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutIcon className="h-5 w-5" />
                  Layout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Modo do Tema</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={theme.theme_mode === 'light' ? 'default' : 'outline'}
                      onClick={() => updateTheme({ theme_mode: 'light' })}
                      className="flex-1"
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme.theme_mode === 'dark' ? 'default' : 'outline'}
                      onClick={() => updateTheme({ theme_mode: 'dark' })}
                      className="flex-1"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="border-radius">Arredondamento das Bordas: {theme.border_radius}px</Label>
                  <input
                    id="border-radius"
                    type="range"
                    min="0"
                    max="32"
                    value={theme.border_radius}
                    onChange={(e) => updateTheme({ border_radius: parseInt(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom CSS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  CSS Customizado
                </CardTitle>
                <CardDescription>
                  Adicione CSS personalizado para ajustes avançados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={theme.custom_css || ''}
                  onChange={(e) => updateTheme({ custom_css: e.target.value })}
                  placeholder=".my-custom-class { color: red; }"
                  rows={10}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Visualização em tempo real</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="font-bold text-xl" style={{ fontFamily: theme.font_family }}>
                      {theme.brand_name}
                    </div>

                    <Button
                      style={{
                        backgroundColor: theme.primary_color,
                        borderRadius: `${theme.border_radius}px`,
                      }}
                      className="w-full"
                    >
                      Botão Primário
                    </Button>

                    <Button
                      variant="outline"
                      style={{
                        borderRadius: `${theme.border_radius}px`,
                      }}
                      className="w-full"
                    >
                      Botão Outline
                    </Button>

                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: theme.success_color + '20',
                        color: theme.success_color,
                        borderRadius: `${theme.border_radius}px`,
                      }}
                    >
                      ✓ Mensagem de sucesso
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: theme.error_color + '20',
                        color: theme.error_color,
                        borderRadius: `${theme.border_radius}px`,
                      }}
                    >
                      ✕ Mensagem de erro
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: theme.warning_color + '20',
                        color: theme.warning_color,
                        borderRadius: `${theme.border_radius}px`,
                      }}
                    >
                      ⚠ Mensagem de aviso
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: theme.info_color + '20',
                        color: theme.info_color,
                        borderRadius: `${theme.border_radius}px`,
                      }}
                    >
                      ℹ Mensagem informativa
                    </div>

                    <p style={{ fontFamily: theme.font_family, fontSize: `${theme.font_size_base}px` }}>
                      Este é um exemplo de texto usando a fonte {theme.font_family} com tamanho{' '}
                      {theme.font_size_base}px.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

