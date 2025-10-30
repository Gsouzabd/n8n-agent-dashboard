-- Create theme_settings table
CREATE TABLE IF NOT EXISTS theme_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID, -- Para futura integração com multi-tenancy
  
  -- Branding
  brand_name TEXT DEFAULT 'AI Dashboard',
  logo_url TEXT,
  logo_vertical_url TEXT,
  favicon_url TEXT,
  
  -- Colors
  primary_color VARCHAR(7) DEFAULT '#F07D00',
  secondary_color VARCHAR(7) DEFAULT '#000000',
  success_color VARCHAR(7) DEFAULT '#10B981',
  error_color VARCHAR(7) DEFAULT '#EF4444',
  warning_color VARCHAR(7) DEFAULT '#F59E0B',
  info_color VARCHAR(7) DEFAULT '#3B82F6',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#000000',
  
  -- Typography
  font_family TEXT DEFAULT 'Inter',
  font_size_base INTEGER DEFAULT 16,
  
  -- Layout
  theme_mode VARCHAR(10) DEFAULT 'dark',
  border_radius INTEGER DEFAULT 12,
  custom_css TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own theme settings"
  ON theme_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own theme settings"
  ON theme_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme settings"
  ON theme_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own theme settings"
  ON theme_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_theme_settings_user_id ON theme_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_settings_org_id ON theme_settings(organization_id);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_theme_settings_updated_at ON theme_settings;
CREATE TRIGGER update_theme_settings_updated_at 
  BEFORE UPDATE ON theme_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
CREATE POLICY "Users can upload their own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view all logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

COMMENT ON TABLE theme_settings IS 'Stores theme customization settings for users and organizations';

