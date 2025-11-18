-- Add icon_url column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Add comment
COMMENT ON COLUMN agents.icon_url IS 'URL da imagem do ícone do agente para exibição no chat';

