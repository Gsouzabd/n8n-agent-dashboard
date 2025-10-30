export interface ThemeSettings {
  id?: string
  user_id?: string
  organization_id?: string
  
  // Branding
  brand_name: string
  logo_url?: string
  logo_vertical_url?: string
  favicon_url?: string
  
  // Colors
  primary_color: string
  secondary_color: string
  success_color: string
  error_color: string
  warning_color: string
  info_color: string
  background_color: string
  text_color: string
  
  // Typography
  font_family: string
  font_size_base: number
  
  // Layout
  theme_mode: 'light' | 'dark'
  border_radius: number
  custom_css?: string
  
  created_at?: string
  updated_at?: string
}

export const DEFAULT_THEME: ThemeSettings = {
  brand_name: 'AI Dashboard',
  primary_color: '#F07D00',
  secondary_color: '#000000',
  success_color: '#10B981',
  error_color: '#EF4444',
  warning_color: '#F59E0B',
  info_color: '#3B82F6',
  background_color: '#FFFFFF',
  text_color: '#000000',
  font_family: 'Inter',
  font_size_base: 16,
  theme_mode: 'dark',
  border_radius: 12,
}

export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Ubuntu',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Work Sans',
  'Fira Sans',
  'Space Grotesk',
]

