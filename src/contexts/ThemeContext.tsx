import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ThemeSettings, DEFAULT_THEME } from '@/types/theme'

interface ThemeContextType {
  theme: ThemeSettings
  loading: boolean
  updateTheme: (newTheme: Partial<ThemeSettings>) => Promise<void>
  resetTheme: () => Promise<void>
  exportTheme: () => string
  importTheme: (json: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)

  // Recarregar tema quando o usuário mudar (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Recarregar tema do novo usuário
        loadTheme()
      } else if (event === 'SIGNED_OUT') {
        // Resetar para tema padrão no logout
        setTheme(DEFAULT_THEME)
        setLoading(false)
      }
    })

    // Carregar tema na montagem inicial
    loadTheme()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Aplicar tema via CSS Variables
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const loadTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Tentar carregar do localStorage se não estiver logado
        const cached = localStorage.getItem('theme_settings')
        if (cached) {
          setTheme(JSON.parse(cached))
        }
        setLoading(false)
        return
      }

      // Buscar tema do banco
      const { data, error } = await supabase
        .from('theme_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar tema:', error)
      }

      if (data) {
        setTheme(data as ThemeSettings)
        localStorage.setItem('theme_settings', JSON.stringify(data))
      } else {
        // Criar tema padrão no banco
        const { data: newTheme, error: insertError } = await supabase
          .from('theme_settings')
          .insert([{ ...DEFAULT_THEME, user_id: user.id }])
          .select()
          .single()

        if (insertError) {
          // Se já existe (erro 409), buscar novamente
          if (insertError.code === '23505') {
            const { data: existingTheme } = await supabase
              .from('theme_settings')
              .select('*')
              .eq('user_id', user.id)
              .single()
            
            if (existingTheme) {
              setTheme(existingTheme as ThemeSettings)
            }
          } else {
            console.error('Erro ao criar tema padrão:', insertError)
            // Usar tema padrão do localStorage ou DEFAULT_THEME
            setTheme(DEFAULT_THEME)
          }
        } else if (newTheme) {
          setTheme(newTheme as ThemeSettings)
          localStorage.setItem('theme_settings', JSON.stringify(newTheme))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement

    // Aplicar cores
    root.style.setProperty('--color-primary', themeSettings.primary_color)
    root.style.setProperty('--color-secondary', themeSettings.secondary_color)
    root.style.setProperty('--color-success', themeSettings.success_color)
    root.style.setProperty('--color-error', themeSettings.error_color)
    root.style.setProperty('--color-warning', themeSettings.warning_color)
    root.style.setProperty('--color-info', themeSettings.info_color)
    root.style.setProperty('--color-background', themeSettings.background_color)
    root.style.setProperty('--color-text', themeSettings.text_color)

    // Aplicar tipografia
    root.style.setProperty('--font-family', themeSettings.font_family)
    root.style.setProperty('--font-size-base', `${themeSettings.font_size_base}px`)

    // Aplicar layout
    root.style.setProperty('--border-radius', `${themeSettings.border_radius}px`)

    // Aplicar modo (dark/light)
    if (themeSettings.theme_mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Aplicar CSS customizado
    let customStyleEl = document.getElementById('custom-theme-css')
    if (!customStyleEl && themeSettings.custom_css) {
      customStyleEl = document.createElement('style')
      customStyleEl.id = 'custom-theme-css'
      document.head.appendChild(customStyleEl)
    }
    if (customStyleEl && themeSettings.custom_css) {
      customStyleEl.textContent = themeSettings.custom_css
    }

    // Carregar Google Font
    if (themeSettings.font_family && themeSettings.font_family !== 'Inter') {
      const fontLink = document.getElementById('google-font')
      if (fontLink) {
        fontLink.remove()
      }
      const link = document.createElement('link')
      link.id = 'google-font'
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${themeSettings.font_family.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`
      document.head.appendChild(link)
    }
  }

  const updateTheme = async (newTheme: Partial<ThemeSettings>) => {
    const updatedTheme = { ...theme, ...newTheme }
    setTheme(updatedTheme)
    
    // Salvar no localStorage imediatamente
    localStorage.setItem('theme_settings', JSON.stringify(updatedTheme))

    // Salvar no banco se estiver logado
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('theme_settings')
        .upsert({
          ...updatedTheme,
          user_id: user.id,
        })

      if (error) {
        console.error('Erro ao salvar tema:', error)
        throw error
      }
    }
  }

  const resetTheme = async () => {
    await updateTheme(DEFAULT_THEME)
  }

  const exportTheme = () => {
    return JSON.stringify(theme, null, 2)
  }

  const importTheme = async (json: string) => {
    try {
      const imported = JSON.parse(json)
      
      // Remover campos de sistema
      delete imported.id
      delete imported.user_id
      delete imported.organization_id
      delete imported.created_at
      delete imported.updated_at
      
      await updateTheme(imported)
    } catch (error) {
      console.error('Erro ao importar tema:', error)
      throw new Error('JSON inválido')
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        loading,
        updateTheme,
        resetTheme,
        exportTheme,
        importTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

