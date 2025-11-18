-- Add WhatsApp integration fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;

-- Add comments
COMMENT ON COLUMN agents.whatsapp_phone_id IS 'ID do número de telefone do WhatsApp Business API';
COMMENT ON COLUMN agents.whatsapp_token IS 'Token de acesso do WhatsApp Business API';






