-- Create vehicles table to support multiple vehicles per incident
CREATE TABLE public.veiculos_envolvidos (
  id SERIAL PRIMARY KEY,
  sinistro_id INTEGER REFERENCES public.sinistros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'terceiro', -- 'onibus' or 'terceiro'
  placa TEXT,
  modelo TEXT,
  cor TEXT,
  documento_url TEXT,
  documento_path TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.veiculos_envolvidos ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (incident submission)
CREATE POLICY "Allow public insert on veiculos_envolvidos"
ON public.veiculos_envolvidos
FOR INSERT
WITH CHECK (true);

-- Create policy for public read (for now, until auth is implemented)
CREATE POLICY "Allow public read on veiculos_envolvidos"
ON public.veiculos_envolvidos
FOR SELECT
USING (true);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos_envolvidos;