# 🎨 Guia de Implementação: Sistema de Temas

**Prioridade**: ⭐⭐⭐ Alta  
**Tempo Estimado**: 1-2 semanas  
**Complexidade**: Média

---

## 📋 Checklist de Implementação

### Fase 1: Database (Dia 1)
- [ ] Criar migration `theme_settings`
- [ ] Criar migration `storage bucket` para logos
- [ ] Configurar RLS policies
- [ ] Testar insert/update/delete

### Fase 2: Backend (Dias 2-3)
- [ ] Edge Function: `upload-logo` (resize + otimização)
- [ ] Edge Function: `validate-theme` (validação de cores HEX)
- [ ] Configurar CORS no Storage

### Fase 3: Frontend Core (Dias 4-6)
- [ ] Hook: `useTheme()` com Zustand
- [ ] Componente: `ThemeProvider`
- [ ] Aplicar CSS Variables dinamicamente
- [ ] Persistir tema no localStorage

### Fase 4: UI Components (Dias 7-9)
- [ ] Página: `BrandingSettings.tsx`
- [ ] Componente: `ColorPicker`
- [ ] Componente: `LogoUploader`
- [ ] Componente: `FontSelector`
- [ ] Componente: `ThemePreview`

### Fase 5: Features Avançadas (Dias 10-12)
- [ ] Export tema para JSON
- [ ] Import tema de JSON
- [ ] Reset para tema padrão
- [ ] Custom CSS editor (com syntax highlight)

### Fase 6: Testes & Documentação (Dias 13-14)
- [ ] Testes unitários (Vitest)
- [ ] Testes E2E (Playwright)
- [ ] Documentação de uso
- [ ] Video tutorial

---

## 🗄️ Schema SQL Completo

```sql
-- Migration: 20250128000000_theme_settings.sql

-- Criar tabela principal
CREATE TABLE theme_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Branding
  brand_name TEXT DEFAULT 'AI Dashboard',
  tagline TEXT,
  logo_url TEXT,
  logo_small_url TEXT,
  favicon_url TEXT,
  
  -- Colors (Hex format: #RRGGBB)
  primary_color VARCHAR(7) DEFAULT '#F07D00',
  secondary_color VARCHAR(7) DEFAULT '#000000',
  accent_color VARCHAR(7) DEFAULT '#1E293B',
  success_color VARCHAR(7) DEFAULT '#10B981',
  error_color VARCHAR(7) DEFAULT '#EF4444',
  warning_color VARCHAR(7) DEFAULT '#F59E0B',
  info_color VARCHAR(7) DEFAULT '#3B82F6',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#1F2937',
  
  -- Typography
  font_family TEXT DEFAULT 'Inter',
  font_size_base INTEGER DEFAULT 16 CHECK (font_size_base BETWEEN 12 AND 24),
  font_weight_normal INTEGER DEFAULT 400,
  font_weight_bold INTEGER DEFAULT 700,
  line_height DECIMAL(3, 2) DEFAULT 1.5,
  
  -- Layout
  sidebar_position VARCHAR(10) DEFAULT 'left' CHECK (sidebar_position IN ('left', 'right', 'top')),
  theme_mode VARCHAR(10) DEFAULT 'dark' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  border_radius INTEGER DEFAULT 12 CHECK (border_radius BETWEEN 0 AND 32),
  container_max_width INTEGER DEFAULT 1280 CHECK (container_max_width BETWEEN 960 AND 1920),
  spacing_unit INTEGER DEFAULT 4 CHECK (spacing_unit BETWEEN 2 AND 8),
  
  -- Advanced
  custom_css TEXT,
  custom_js TEXT,
  
  -- SEO (para white-label completo)
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  meta_image_url TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_theme UNIQUE(user_id),
  CONSTRAINT unique_org_theme UNIQUE(organization_id),
  CONSTRAINT valid_hex_colors CHECK (
    primary_color ~* '^#[0-9A-F]{6}$' AND
    secondary_color ~* '^#[0-9A-F]{6}$' AND
    accent_color ~* '^#[0-9A-F]{6}$'
  )
);

-- Índices para performance
CREATE INDEX idx_theme_settings_user ON theme_settings(user_id);
CREATE INDEX idx_theme_settings_org ON theme_settings(organization_id);
CREATE INDEX idx_theme_settings_active ON theme_settings(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio tema
CREATE POLICY "Users can view their theme"
  ON theme_settings FOR SELECT
  USING (
    auth.uid() = user_id OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Usuários podem criar seu tema
CREATE POLICY "Users can create their theme"
  ON theme_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seu tema
CREATE POLICY "Users can update their theme"
  ON theme_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Apenas owners podem atualizar tema da organização
CREATE POLICY "Owners can update org theme"
  ON theme_settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_theme_settings_updated_at
  BEFORE UPDATE ON theme_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket para logos e assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-assets', 'theme-assets', true);

-- Storage policies
CREATE POLICY "Users can upload theme assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'theme-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Theme assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theme-assets');

CREATE POLICY "Users can delete their theme assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'theme-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Função para validar cores HEX
CREATE OR REPLACE FUNCTION is_valid_hex_color(color TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN color ~* '^#[0-9A-F]{6}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentários para documentação
COMMENT ON TABLE theme_settings IS 'Armazena configurações de tema/branding por usuário ou organização';
COMMENT ON COLUMN theme_settings.custom_css IS 'CSS customizado aplicado globalmente. Validar antes de salvar!';
COMMENT ON COLUMN theme_settings.custom_js IS 'JavaScript customizado (analytics, chatbots, etc). Usar com cuidado!';
```

---

## 🎣 Hook useTheme

```typescript
// src/hooks/useTheme.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export interface ThemeSettings {
  id?: string
  brandName: string
  logoUrl?: string
  faviconUrl?: string
  
  // Colors
  primaryColor: string
  secondaryColor: string
  accentColor: string
  successColor: string
  errorColor: string
  warningColor: string
  infoColor: string
  backgroundColor: string
  textColor: string
  
  // Typography
  fontFamily: string
  fontSizeBase: number
  fontWeightNormal: number
  fontWeightBold: number
  
  // Layout
  themeMode: 'light' | 'dark' | 'auto'
  borderRadius: number
  containerMaxWidth: number
  
  // Advanced
  customCss?: string
}

interface ThemeStore {
  theme: ThemeSettings | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadTheme: () => Promise<void>
  updateTheme: (updates: Partial<ThemeSettings>) => Promise<void>
  applyTheme: (theme: ThemeSettings) => void
  resetTheme: () => Promise<void>
  exportTheme: () => string
  importTheme: (json: string) => Promise<void>
}

const DEFAULT_THEME: ThemeSettings = {
  brandName: 'AI Dashboard',
  primaryColor: '#F07D00',
  secondaryColor: '#000000',
  accentColor: '#1E293B',
  successColor: '#10B981',
  errorColor: '#EF4444',
  warningColor: '#F59E0B',
  infoColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  fontFamily: 'Inter',
  fontSizeBase: 16,
  fontWeightNormal: 400,
  fontWeightBold: 700,
  themeMode: 'dark',
  borderRadius: 12,
  containerMaxWidth: 1280,
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      isLoading: false,
      error: null,

      loadTheme: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('theme_settings')
            .select('*')
            .single()

          if (error && error.code !== 'PGRST116') {
            throw error
          }

          if (data) {
            const theme = {
              ...DEFAULT_THEME,
              ...data,
              id: data.id,
            }
            set({ theme })
            get().applyTheme(theme)
          }
        } catch (error: any) {
          console.error('Error loading theme:', error)
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },

      updateTheme: async (updates) => {
        const currentTheme = get().theme || DEFAULT_THEME
        const newTheme = { ...currentTheme, ...updates }

        try {
          const { data, error } = await supabase
            .from('theme_settings')
            .upsert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              ...newTheme,
            })
            .select()
            .single()

          if (error) throw error

          set({ theme: data })
          get().applyTheme(data)
        } catch (error: any) {
          console.error('Error updating theme:', error)
          set({ error: error.message })
          throw error
        }
      },

      applyTheme: (theme) => {
        const root = document.documentElement

        // Aplicar cores como CSS variables
        root.style.setProperty('--color-primary', theme.primaryColor)
        root.style.setProperty('--color-secondary', theme.secondaryColor)
        root.style.setProperty('--color-accent', theme.accentColor)
        root.style.setProperty('--color-success', theme.successColor)
        root.style.setProperty('--color-error', theme.errorColor)
        root.style.setProperty('--color-warning', theme.warningColor)
        root.style.setProperty('--color-info', theme.infoColor)
        root.style.setProperty('--color-background', theme.backgroundColor)
        root.style.setProperty('--color-text', theme.textColor)

        // Aplicar tipografia
        root.style.setProperty('--font-family', theme.fontFamily)
        root.style.setProperty('--font-size-base', `${theme.fontSizeBase}px`)
        root.style.setProperty('--font-weight-normal', theme.fontWeightNormal.toString())
        root.style.setProperty('--font-weight-bold', theme.fontWeightBold.toString())

        // Aplicar layout
        root.style.setProperty('--border-radius', `${theme.borderRadius}px`)
        root.style.setProperty('--container-max-width', `${theme.containerMaxWidth}px`)

        // Aplicar modo (dark/light)
        if (theme.themeMode === 'dark') {
          document.documentElement.classList.add('dark')
        } else if (theme.themeMode === 'light') {
          document.documentElement.classList.remove('dark')
        } else {
          // Auto: detectar preferência do sistema
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          document.documentElement.classList.toggle('dark', prefersDark)
        }

        // Aplicar Custom CSS
        if (theme.customCss) {
          let styleElement = document.getElementById('custom-theme-css') as HTMLStyleElement
          
          if (!styleElement) {
            styleElement = document.createElement('style')
            styleElement.id = 'custom-theme-css'
            document.head.appendChild(styleElement)
          }
          
          styleElement.innerHTML = theme.customCss
        }

        // Atualizar meta tags
        document.title = theme.brandName
        
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (favicon && theme.faviconUrl) {
          favicon.href = theme.faviconUrl
        }
      },

      resetTheme: async () => {
        try {
          const { error } = await supabase
            .from('theme_settings')
            .delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id!)

          if (error) throw error

          set({ theme: DEFAULT_THEME })
          get().applyTheme(DEFAULT_THEME)
        } catch (error: any) {
          console.error('Error resetting theme:', error)
          set({ error: error.message })
          throw error
        }
      },

      exportTheme: () => {
        const theme = get().theme
        return JSON.stringify(theme, null, 2)
      },

      importTheme: async (json) => {
        try {
          const theme = JSON.parse(json) as ThemeSettings
          await get().updateTheme(theme)
        } catch (error: any) {
          console.error('Error importing theme:', error)
          set({ error: 'JSON inválido' })
          throw error
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
```

---

## 🎨 Componente ColorPicker

```typescript
// src/components/theme/ColorPicker.tsx
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  label: string
  description?: string
  value: string
  onChange: (color: string) => void
}

const PRESET_COLORS = [
  '#F07D00', // Laranja (atual)
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#F59E0B', // Amarelo
  '#EC4899', // Rosa
  '#000000', // Preto
]

export function ColorPicker({ label, description, value, onChange }: ColorPickerProps) {
  const [showPresets, setShowPresets] = useState(false)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div className="flex items-center gap-2">
        {/* Color Input (HTML5) */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-700"
          />
        </div>

        {/* Hex Input */}
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            const hex = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
              onChange(hex)
            }
          }}
          placeholder="#000000"
          className="w-32 font-mono text-sm"
          maxLength={7}
        />

        {/* Preset Colors Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowPresets(!showPresets)}
          title="Cores pré-definidas"
        >
          <Palette className="w-4 h-4" />
        </Button>
      </div>

      {/* Preset Colors Grid */}
      {showPresets && (
        <div className="flex gap-2 flex-wrap p-2 border rounded-lg">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onChange(color)
                setShowPresets(false)
              }}
              className="w-8 h-8 rounded-md border-2 border-gray-300 dark:border-gray-700 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Preview Box */}
      <div
        className="w-full h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm font-medium"
        style={{
          backgroundColor: value,
          color: getContrastColor(value),
        }}
      >
        Preview: {label}
      </div>
    </div>
  )
}

// Calcula cor de contraste (preto ou branco) baseado na luminosidade
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  
  // Fórmula de luminosidade relativa
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
```

---

## 📄 Página BrandingSettings (Resumo)

```typescript
// src/pages/BrandingSettings.tsx
export function BrandingSettings() {
  const { theme, updateTheme, exportTheme, importTheme, resetTheme } = useTheme()

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Tabs defaultValue="colors">
          <TabsList>
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="typography">Tipografia</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="logos">Logos</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Tab Colors */}
          <TabsContent value="colors">
            <Card>
              <CardContent className="space-y-6">
                <ColorPicker
                  label="Cor Primária"
                  description="Usada em botões, links e destaques"
                  value={theme.primaryColor}
                  onChange={(color) => updateTheme({ primaryColor: color })}
                />
                {/* Mais color pickers... */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outras tabs... */}
        </Tabs>
      </div>
    </Layout>
  )
}
```

---

## ✅ Testes

```typescript
// src/hooks/useTheme.test.ts
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('deve carregar tema padrão', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme?.primaryColor).toBe('#F07D00')
  })

  it('deve atualizar cor primária', async () => {
    const { result } = renderHook(() => useTheme())
    
    await act(async () => {
      await result.current.updateTheme({ primaryColor: '#3B82F6' })
    })

    expect(result.current.theme?.primaryColor).toBe('#3B82F6')
  })

  it('deve exportar tema como JSON', () => {
    const { result } = renderHook(() => useTheme())
    const json = result.current.exportTheme()
    expect(JSON.parse(json)).toHaveProperty('primaryColor')
  })
})
```

---

## 🎥 Tutorial em Vídeo (Script)

**Duração**: 3-5 minutos

1. **Intro (0:00-0:15)**
   - "Aprenda a personalizar completamente seu dashboard de IA"

2. **Acessar Configurações (0:15-0:30)**
   - Navegar até Settings → Branding

3. **Mudar Cores (0:30-1:30)**
   - Demonstrar color picker
   - Mostrar presets
   - Preview em tempo real

4. **Upload de Logo (1:30-2:00)**
   - Drag & drop de imagem
   - Crop e ajuste automático

5. **Customizar Tipografia (2:00-2:30)**
   - Escolher fonte do Google Fonts
   - Ajustar tamanhos

6. **Export/Import (2:30-3:00)**
   - Exportar para JSON
   - Compartilhar com time
   - Importar tema pronto

7. **Resultado Final (3:00-3:30)**
   - Mostrar dashboard completamente customizado
   - CTA: "Experimente agora!"

---

**Status**: 📝 Pronto para implementação  
**Próximo Doc**: `IMPLEMENTACAO_MULTI_TENANCY.md`



