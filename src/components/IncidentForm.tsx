import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, ChevronDown, ChevronUp, CalendarIcon, FileText, Mic, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { PhotoGuide } from "./PhotoGuide";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const incidentSchema = z.object({
  local_acidente: z.string().min(5, "O local precisa ter mais detalhes"),
  onibus: z.string().min(1, "Informe o número do ônibus"),
  motorista: z.string().min(3, "Informe o nome completo do motorista"),
  chapa: z.string().optional(),
  responsabilidade: z.enum(["motorista", "terceiro"]),
  descricao: z.string().min(20, "Descreva com mais detalhes (mínimo 20 caracteres)")
});

interface Witness {
  nome: string;
  telefone: string;
}

interface AdditionalDoc {
  tipo: "bo" | "cnh" | "documento" | "audio" | "outro";
  file: File;
}

export const IncidentForm = () => {
  const [formData, setFormData] = useState({
    local_acidente: "",
    onibus: "",
    motorista: "",
    chapa: "",
    responsabilidade: "terceiro",
    descricao: "",
    cep: "",
    observacoes_complementares: ""
  });
  const [dataOcorrencia, setDataOcorrencia] = useState<Date | undefined>(undefined);
  const [witnesses, setWitnesses] = useState<Witness[]>([{
    nome: "",
    telefone: ""
  }]);
  const [images, setImages] = useState<{
    frontal?: File;
    lateral?: File;
    danos?: File;
    contexto?: File;
  }>({});
  const [imagePreviews, setImagePreviews] = useState<{
    frontal?: string;
    lateral?: string;
    danos?: string;
    contexto?: string;
  }>({});
  const [additionalDocs, setAdditionalDocs] = useState<AdditionalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoSectionExpanded, setPhotoSectionExpanded] = useState(false);
  const [additionalSectionExpanded, setAdditionalSectionExpanded] = useState(false);

  // Cleanup preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const handleAddWitness = () => {
    setWitnesses([...witnesses, {
      nome: "",
      telefone: ""
    }]);
  };
  
  const handleRemoveWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };
  
  const handleWitnessChange = (index: number, field: keyof Witness, value: string) => {
    const newWitnesses = [...witnesses];
    newWitnesses[index][field] = value;
    setWitnesses(newWitnesses);
  };
  
  const handlePhotoSelect = (type: keyof typeof images, file: File) => {
    setImages(prev => ({
      ...prev,
      [type]: file
    }));

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviews(prev => ({
      ...prev,
      [type]: previewUrl
    }));
  };
  
  const handlePhotoRemove = (type: keyof typeof images) => {
    // Revoke the old preview URL to free memory
    if (imagePreviews[type]) {
      URL.revokeObjectURL(imagePreviews[type]!);
    }
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[type];
      return newImages;
    });
    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[type];
      return newPreviews;
    });
  };

  const handleAdditionalDocSelect = (tipo: AdditionalDoc["tipo"], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdditionalDocs(prev => [...prev, { tipo, file }]);
    }
    e.target.value = "";
  };

  const handleRemoveAdditionalDoc = (index: number) => {
    setAdditionalDocs(prev => prev.filter((_, i) => i !== index));
  };

  const imageCount = Object.values(images).filter(Boolean).length;
  
  const generateProtocol = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").split(".")[0];
    return `SIN-TB-${timestamp}`;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate form
      incidentSchema.parse(formData);
      if (imageCount < 4) {
        toast.error("Precisamos das 4 fotografias obrigatórias para continuar");
        return;
      }
      setLoading(true);
      const protocolo = generateProtocol();

      // Insert incident
      const {
        data: sinistro,
        error: sinistroError
      } = await supabase.from("sinistros").insert({
        protocolo,
        local_acidente: formData.local_acidente,
        onibus: formData.onibus,
        motorista: formData.motorista,
        chapa: formData.chapa || null,
        responsabilidade: formData.responsabilidade,
        descricao: formData.descricao,
        cep: formData.cep || null,
        data_ocorrencia: dataOcorrencia?.toISOString() || null,
        observacoes_complementares: formData.observacoes_complementares || null
      }).select().single();
      if (sinistroError) throw sinistroError;

      // Insert witnesses
      const validWitnesses = witnesses.filter(w => w.nome && w.telefone);
      if (validWitnesses.length > 0) {
        const { error: witnessError } = await supabase.from("testemunhas").insert(validWitnesses.map(w => ({
          sinistro_id: sinistro.id,
          ...w
        })));
        if (witnessError) throw witnessError;
      }

      // Upload images
      const imageEntries = Object.entries(images).filter(([_, file]) => file);
      for (const [type, file] of imageEntries) {
        if (!file) continue;
        const filePath = `${protocolo}/${Date.now()}-${type}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("sinistros").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("sinistros").getPublicUrl(filePath);
        await supabase.from("imagens").insert({
          sinistro_id: sinistro.id,
          nome_arquivo: file.name,
          url_publica: publicUrl,
          path_storage: filePath,
          tamanho: file.size,
          tipo_mime: file.type
        });
      }

      // Upload additional documents
      for (const doc of additionalDocs) {
        const filePath = `${protocolo}/docs/${Date.now()}-${doc.tipo}-${doc.file.name}`;
        const { error: uploadError } = await supabase.storage.from("sinistros").upload(filePath, doc.file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("sinistros").getPublicUrl(filePath);
        await supabase.from("documentos_complementares").insert({
          sinistro_id: sinistro.id,
          tipo: doc.tipo,
          nome_arquivo: doc.file.name,
          url_publica: publicUrl,
          path_storage: filePath,
          tamanho: doc.file.size,
          tipo_mime: doc.file.type
        });
      }

      toast.success(`Relato registrado com sucesso. Protocolo: ${protocolo}`);

      // Reset form
      setFormData({
        local_acidente: "",
        onibus: "",
        motorista: "",
        chapa: "",
        responsabilidade: "terceiro",
        descricao: "",
        cep: "",
        observacoes_complementares: ""
      });
      setDataOcorrencia(undefined);
      setWitnesses([{ nome: "", telefone: "" }]);
      setImages({});
      setImagePreviews({});
      setAdditionalDocs([]);
      setPhotoSectionExpanded(false);
      setAdditionalSectionExpanded(false);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao enviar relato. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const docTypeLabels: Record<AdditionalDoc["tipo"], string> = {
    bo: "B.O.",
    cnh: "CNH",
    documento: "Documento",
    audio: "Áudio",
    outro: "Outro"
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
          Dados do Sinistro
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Preencha as informações abaixo
        </p>
      </div>

      {/* Glass Card */}
      <div className="glass rounded-2xl p-5 sm:p-6 md:p-8 space-y-6">
        {/* Data da Ocorrência */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Data da Ocorrência
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-11 justify-start text-left font-normal bg-input/50 border-border/50",
                  !dataOcorrencia && "text-muted-foreground/50"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataOcorrencia ? format(dataOcorrencia, "PPP", { locale: ptBR }) : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataOcorrencia}
                onSelect={setDataOcorrencia}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Local, CEP e Ônibus */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="local" className="text-sm font-medium text-foreground">
              Local
            </Label>
            <Input
              id="local"
              value={formData.local_acidente}
              onChange={e => setFormData({ ...formData, local_acidente: e.target.value })}
              placeholder="Endereço ou referência"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep" className="text-sm font-medium text-foreground">
              CEP <span className="text-muted-foreground/50">(opcional)</span>
            </Label>
            <Input
              id="cep"
              value={formData.cep}
              onChange={e => setFormData({ ...formData, cep: e.target.value })}
              placeholder="00000-000"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              maxLength={9}
            />
          </div>
        </div>

        {/* Ônibus */}
        <div className="space-y-2">
          <Label htmlFor="onibus" className="text-sm font-medium text-foreground">
            Ônibus
          </Label>
          <Input
            id="onibus"
            value={formData.onibus}
            onChange={e => setFormData({ ...formData, onibus: e.target.value })}
            placeholder="Nº do veículo"
            className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
            required
          />
        </div>

        {/* Motorista e Chapa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="motorista" className="text-sm font-medium text-foreground">
              Motorista
            </Label>
            <Input
              id="motorista"
              value={formData.motorista}
              onChange={e => setFormData({ ...formData, motorista: e.target.value })}
              placeholder="Nome completo"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapa" className="text-sm font-medium text-foreground">
              Chapa
            </Label>
            <Input
              id="chapa"
              value={formData.chapa}
              onChange={e => setFormData({ ...formData, chapa: e.target.value })}
              placeholder="Opcional"
              className="h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Responsabilidade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Responsabilidade</Label>
          <RadioGroup
            value={formData.responsabilidade}
            onValueChange={value => setFormData({ ...formData, responsabilidade: value })}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex items-center space-x-3 flex-1 border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer bg-input/30 active:scale-[0.98]">
              <RadioGroupItem value="motorista" id="motorista-resp" />
              <Label htmlFor="motorista-resp" className="cursor-pointer flex-1 text-sm">
                Motorista
              </Label>
            </div>
            <div className="flex items-center space-x-3 flex-1 border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer bg-input/30 active:scale-[0.98]">
              <RadioGroupItem value="terceiro" id="terceiro-resp" />
              <Label htmlFor="terceiro-resp" className="cursor-pointer flex-1 text-sm">
                Terceiros
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Testemunhas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">Testemunhas</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleAddWitness}
              className="h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>
          {witnesses.map((witness, index) => (
            <div key={index} className="flex gap-2 sm:gap-3">
              <Input
                placeholder="Nome"
                value={witness.nome}
                onChange={e => handleWitnessChange(index, "nome", e.target.value)}
                className="flex-1 h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              />
              <Input
                placeholder="Telefone"
                value={witness.telefone}
                onChange={e => handleWitnessChange(index, "telefone", e.target.value)}
                className="flex-1 h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              />
              {witnesses.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveWitness(index)}
                  className="h-11 w-11 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="descricao" className="text-sm font-medium text-foreground">
            Descrição
          </Label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descreva o ocorrido com detalhes..."
            rows={5}
            className="resize-none bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
            required
          />
        </div>

        {/* Upload de Fotos */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setPhotoSectionExpanded(!photoSectionExpanded)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/50 bg-input/30 transition-all duration-300 group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-foreground cursor-pointer">
                Fotografias
              </Label>
              <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${
                imageCount === 4 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {imageCount}/4
              </span>
            </div>
            {photoSectionExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>

          <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${
            photoSectionExpanded 
              ? "opacity-100 max-h-[2000px]" 
              : "opacity-0 max-h-0 overflow-hidden"
          }`}>
            <PhotoGuide
              type="frontal"
              onFileSelect={file => handlePhotoSelect("frontal", file)}
              imagePreview={imagePreviews.frontal}
              onRemove={() => handlePhotoRemove("frontal")}
            />
            <PhotoGuide
              type="lateral"
              onFileSelect={file => handlePhotoSelect("lateral", file)}
              imagePreview={imagePreviews.lateral}
              onRemove={() => handlePhotoRemove("lateral")}
            />
            <PhotoGuide
              type="danos"
              onFileSelect={file => handlePhotoSelect("danos", file)}
              imagePreview={imagePreviews.danos}
              onRemove={() => handlePhotoRemove("danos")}
            />
            <PhotoGuide
              type="contexto"
              onFileSelect={file => handlePhotoSelect("contexto", file)}
              imagePreview={imagePreviews.contexto}
              onRemove={() => handlePhotoRemove("contexto")}
            />
          </div>

          {photoSectionExpanded && imageCount < 4 && (
            <p className="text-xs text-muted-foreground/70 text-center animate-fade-in">
              Toque em cada campo para capturar
            </p>
          )}
        </div>

        {/* Informações Complementares - Expandable Section */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setAdditionalSectionExpanded(!additionalSectionExpanded)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/50 bg-input/30 transition-all duration-300 group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-foreground cursor-pointer">
                Informações Complementares
              </Label>
              <span className="text-xs text-muted-foreground/60">(opcional)</span>
            </div>
            {additionalSectionExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>

          <div className={`space-y-4 transition-all duration-500 ${
            additionalSectionExpanded 
              ? "opacity-100 max-h-[2000px]" 
              : "opacity-0 max-h-0 overflow-hidden"
          }`}>
            {/* Document upload buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* B.O. Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
                <FileText className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs font-medium">B.O.</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleAdditionalDocSelect("bo", e)}
                  className="hidden"
                />
              </label>

              {/* CNH Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
                <FileImage className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs font-medium">CNH</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleAdditionalDocSelect("cnh", e)}
                  className="hidden"
                />
              </label>

              {/* Document Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
                <FileText className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs font-medium">Documento</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleAdditionalDocSelect("documento", e)}
                  className="hidden"
                />
              </label>

              {/* Audio Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
                <Mic className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs font-medium">Áudio</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleAdditionalDocSelect("audio", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploaded docs list */}
            {additionalDocs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Arquivos anexados:</Label>
                {additionalDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-primary">{docTypeLabels[doc.tipo]}</span>
                      <span className="text-xs text-muted-foreground truncate">{doc.file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAdditionalDoc(index)}
                      className="h-6 w-6 shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Observações complementares */}
            <div className="space-y-2">
              <Label htmlFor="observacoes" className="text-sm font-medium text-foreground">
                Observações Adicionais
              </Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes_complementares}
                onChange={e => setFormData({ ...formData, observacoes_complementares: e.target.value })}
                placeholder="Informações adicionais que possam ajudar na análise..."
                rows={3}
                className="resize-none bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300 active:scale-[0.98]"
        disabled={loading}
      >
        {loading ? "Enviando..." : "Enviar"}
      </Button>
      
      <p className="text-center text-xs text-muted-foreground/60">
        Você receberá um protocolo após o envio
      </p>
    </form>
  );
};