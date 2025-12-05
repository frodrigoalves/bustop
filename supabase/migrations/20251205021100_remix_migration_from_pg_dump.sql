CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: documentos_complementares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_complementares (
    id integer NOT NULL,
    sinistro_id integer,
    tipo text NOT NULL,
    nome_arquivo text NOT NULL,
    url_publica text,
    path_storage text,
    tamanho integer,
    tipo_mime text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT documentos_complementares_tipo_check CHECK ((tipo = ANY (ARRAY['bo'::text, 'cnh'::text, 'documento'::text, 'audio'::text, 'outro'::text])))
);


--
-- Name: documentos_complementares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documentos_complementares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_complementares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documentos_complementares_id_seq OWNED BY public.documentos_complementares.id;


--
-- Name: imagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imagens (
    id integer NOT NULL,
    sinistro_id integer,
    nome_arquivo character varying(255) NOT NULL,
    url_publica text,
    path_storage text,
    tamanho integer,
    tipo_mime character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: imagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imagens_id_seq OWNED BY public.imagens.id;


--
-- Name: sinistros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sinistros (
    id integer NOT NULL,
    protocolo character varying(50) NOT NULL,
    data_hora timestamp with time zone DEFAULT now(),
    empresa character varying(20) DEFAULT 'TOPBUS'::character varying,
    local_acidente text NOT NULL,
    onibus character varying(20) NOT NULL,
    motorista character varying(100) NOT NULL,
    chapa character varying(20),
    responsabilidade character varying(20),
    descricao text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'novo'::text,
    analista text,
    parecer_analista text,
    data_conclusao timestamp with time zone,
    prioridade text DEFAULT 'media'::text,
    observacoes_internas text,
    cep text,
    data_ocorrencia timestamp with time zone,
    observacoes_complementares text,
    CONSTRAINT sinistros_prioridade_check CHECK ((prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'urgente'::text]))),
    CONSTRAINT sinistros_responsabilidade_check CHECK (((responsabilidade)::text = ANY ((ARRAY['motorista'::character varying, 'terceiro'::character varying])::text[]))),
    CONSTRAINT sinistros_status_check CHECK ((status = ANY (ARRAY['novo'::text, 'em_analise'::text, 'aguardando_documentos'::text, 'concluido'::text])))
);


--
-- Name: sinistros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sinistros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sinistros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sinistros_id_seq OWNED BY public.sinistros.id;


--
-- Name: testemunhas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testemunhas (
    id integer NOT NULL,
    sinistro_id integer,
    nome character varying(100) NOT NULL,
    telefone character varying(20),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: testemunhas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.testemunhas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: testemunhas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.testemunhas_id_seq OWNED BY public.testemunhas.id;


--
-- Name: documentos_complementares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_complementares ALTER COLUMN id SET DEFAULT nextval('public.documentos_complementares_id_seq'::regclass);


--
-- Name: imagens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagens ALTER COLUMN id SET DEFAULT nextval('public.imagens_id_seq'::regclass);


--
-- Name: sinistros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinistros ALTER COLUMN id SET DEFAULT nextval('public.sinistros_id_seq'::regclass);


--
-- Name: testemunhas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testemunhas ALTER COLUMN id SET DEFAULT nextval('public.testemunhas_id_seq'::regclass);


--
-- Name: documentos_complementares documentos_complementares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_complementares
    ADD CONSTRAINT documentos_complementares_pkey PRIMARY KEY (id);


--
-- Name: imagens imagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagens
    ADD CONSTRAINT imagens_pkey PRIMARY KEY (id);


--
-- Name: sinistros sinistros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinistros
    ADD CONSTRAINT sinistros_pkey PRIMARY KEY (id);


--
-- Name: sinistros sinistros_protocolo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinistros
    ADD CONSTRAINT sinistros_protocolo_key UNIQUE (protocolo);


--
-- Name: testemunhas testemunhas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testemunhas
    ADD CONSTRAINT testemunhas_pkey PRIMARY KEY (id);


--
-- Name: idx_documentos_sinistro_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_sinistro_id ON public.documentos_complementares USING btree (sinistro_id);


--
-- Name: idx_imagens_sinistro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imagens_sinistro ON public.imagens USING btree (sinistro_id);


--
-- Name: idx_sinistros_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sinistros_data ON public.sinistros USING btree (data_hora);


--
-- Name: idx_sinistros_data_ocorrencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sinistros_data_ocorrencia ON public.sinistros USING btree (data_ocorrencia);


--
-- Name: idx_sinistros_protocolo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sinistros_protocolo ON public.sinistros USING btree (protocolo);


--
-- Name: idx_sinistros_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sinistros_status ON public.sinistros USING btree (status);


--
-- Name: idx_testemunhas_sinistro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_testemunhas_sinistro ON public.testemunhas USING btree (sinistro_id);


--
-- Name: documentos_complementares documentos_complementares_sinistro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_complementares
    ADD CONSTRAINT documentos_complementares_sinistro_id_fkey FOREIGN KEY (sinistro_id) REFERENCES public.sinistros(id) ON DELETE CASCADE;


--
-- Name: imagens imagens_sinistro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagens
    ADD CONSTRAINT imagens_sinistro_id_fkey FOREIGN KEY (sinistro_id) REFERENCES public.sinistros(id) ON DELETE CASCADE;


--
-- Name: testemunhas testemunhas_sinistro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testemunhas
    ADD CONSTRAINT testemunhas_sinistro_id_fkey FOREIGN KEY (sinistro_id) REFERENCES public.sinistros(id) ON DELETE CASCADE;


--
-- Name: documentos_complementares Allow all access to documentos_complementares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to documentos_complementares" ON public.documentos_complementares USING (true) WITH CHECK (true);


--
-- Name: imagens Allow all access to imagens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to imagens" ON public.imagens USING (true);


--
-- Name: sinistros Allow all access to sinistros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to sinistros" ON public.sinistros USING (true);


--
-- Name: testemunhas Allow all access to testemunhas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to testemunhas" ON public.testemunhas USING (true);


--
-- Name: documentos_complementares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos_complementares ENABLE ROW LEVEL SECURITY;

--
-- Name: imagens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.imagens ENABLE ROW LEVEL SECURITY;

--
-- Name: sinistros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sinistros ENABLE ROW LEVEL SECURITY;

--
-- Name: testemunhas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testemunhas ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


