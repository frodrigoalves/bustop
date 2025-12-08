import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X, CalendarIcon, FileText, Mic, FileImage, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { PhotoGuide } from "./PhotoGuide";
import { AudioRecorder } from "./AudioRecorder";
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

interface VeiculoEnvolvido {
  placa: string;
  modelo: string;
  cor: string;
  observacoes: string;
}

interface AdditionalDoc {
  tipo: "bo" | "cnh" | "documento_veiculo" | "audio" | "outro";
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
    observacoes_complementares: ""
  });
  const [dataOcorrencia, setDataOcorrencia] = useState<Date | undefined>(undefined);
  const [witnesses, setWitnesses] = useState<Witness[]>([{
    nome: "",
    telefone: ""
  }]);
  const [veiculosEnvolvidos, setVeiculosEnvolvidos] = useState<VeiculoEnvolvido[]>([]);
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleAddVeiculo = () => {
    setVeiculosEnvolvidos([...veiculosEnvolvidos, {
      placa: "",
      modelo: "",
      cor: "",
      observacoes: ""
    }]);
  };

  const handleRemoveVeiculo = (index: number) => {
    setVeiculosEnvolvidos(veiculosEnvolvidos.filter((_, i) => i !== index));
  };

  const handleVeiculoChange = (index: number, field: keyof VeiculoEnvolvido, value: string) => {
    const newVeiculos = [...veiculosEnvolvidos];
    newVeiculos[index][field] = value;
    setVeiculosEnvolvidos(newVeiculos);
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

      // Insert vehicles involved
      const validVeiculos = veiculosEnvolvidos.filter(v => v.placa || v.modelo);
      if (validVeiculos.length > 0) {
        const { error: veiculoError } = await supabase.from("veiculos_envolvidos").insert(validVeiculos.map(v => ({
          sinistro_id: sinistro.id,
          tipo: "terceiro",
          placa: v.placa || null,
          modelo: v.modelo || null,
          cor: v.cor || null,
          observacoes: v.observacoes || null
        })));
        if (veiculoError) throw veiculoError;
      }

      // Upload images
      const imageEntries = Object.entries(images).filter(([_, file]) => file);
      for (const [type, file] of imageEntries) {
        if (!file) continue;
        const filePath = `${protocolo}/${Date.now()}-${type}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("topbus").upload(filePath, file);
        if (uploadError) {
          console.error(`Erro ao fazer upload da imagem ${type}:`, uploadError);
          throw new Error(`Falha ao enviar foto ${type}: ${uploadError.message}`);
        }
        const { data: { publicUrl } } = supabase.storage.from("topbus").getPublicUrl(filePath);
        const { error: insertImageError } = await supabase.from("imagens").insert({
          sinistro_id: sinistro.id,
          nome_arquivo: file.name,
          url_publica: publicUrl,
          path_storage: filePath,
          tamanho: file.size,
          tipo_mime: file.type
        });
        if (insertImageError) {
          console.error(`Erro ao registrar imagem ${type}:`, insertImageError);
          throw new Error(`Falha ao registrar foto ${type}: ${insertImageError.message}`);
        }
      }

      // Upload additional documents (including audio)
      for (const doc of additionalDocs) {
        const filePath = `${protocolo}/docs/${Date.now()}-${doc.tipo}-${doc.file.name}`;
        const { error: uploadError } = await supabase.storage.from("topbus").upload(filePath, doc.file);
        if (uploadError) {
          console.error(`Erro ao fazer upload do documento ${doc.tipo}:`, uploadError);
          throw new Error(`Falha ao enviar documento ${doc.tipo}: ${uploadError.message}`);
        }
        const { data: { publicUrl } } = supabase.storage.from("topbus").getPublicUrl(filePath);
        const { error: insertDocError } = await supabase.from("documentos_complementares").insert({
          sinistro_id: sinistro.id,
          tipo: doc.tipo,
          nome_arquivo: doc.file.name,
          url_publica: publicUrl,
          path_storage: filePath,
          tamanho: doc.file.size,
          tipo_mime: doc.file.type
        });
        if (insertDocError) {
          console.error(`Erro ao registrar documento ${doc.tipo}:`, insertDocError);
          throw new Error(`Falha ao registrar documento ${doc.tipo}: ${insertDocError.message}`);
        }
      }

      // Upload recorded audio if exists
      if (audioBlob) {
        const audioFileName = `audio-descricao-${Date.now()}.webm`;
        const audioFilePath = `${protocolo}/audio/${audioFileName}`;
        const { error: audioUploadError } = await supabase.storage.from("topbus").upload(audioFilePath, audioBlob);
        if (audioUploadError) {
          console.error("Erro ao fazer upload do áudio:", audioUploadError);
          // Não interrompe o fluxo, apenas loga o erro
        } else {
          const { data: { publicUrl: audioUrl } } = supabase.storage.from("topbus").getPublicUrl(audioFilePath);
          const { error: insertAudioError } = await supabase.from("documentos_complementares").insert({
            sinistro_id: sinistro.id,
            tipo: "audio",
            nome_arquivo: audioFileName,
            url_publica: audioUrl,
            path_storage: audioFilePath,
            tamanho: audioBlob.size,
            tipo_mime: "audio/webm"
          });
          if (insertAudioError) {
            console.error("Erro ao registrar áudio:", insertAudioError);
          }
        }
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
        observacoes_complementares: ""
      });
      setDataOcorrencia(undefined);
      setWitnesses([{ nome: "", telefone: "" }]);
      setVeiculosEnvolvidos([]);
      setImages({});
      setImagePreviews({});
      setAdditionalDocs([]);
      setAudioBlob(null);
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
    documento_veiculo: "Doc. Veículo",
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
      <div className="glass rounded-2xl p-4 sm:p-6 md:p-8 space-y-6">
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

        {/* Local do Acidente */}
        <div className="space-y-2">
          <Label htmlFor="local" className="text-sm font-medium text-foreground">
            Local do Acidente
          </Label>
          <Textarea
            id="local"
            value={formData.local_acidente}
            onChange={e => setFormData({ ...formData, local_acidente: e.target.value })}
            placeholder="Ex: Av. Brasil, 1500, próximo ao posto Shell, em frente ao supermercado Extra - Bairro Centro, Cidade - UF"
            className="min-h-[80px] bg-input/50 border-border/50 placeholder:text-muted-foreground/50 resize-none"
            required
          />
          <p className="text-xs text-muted-foreground/70">
            Inclua rua, número, pontos de referência, bairro e cidade para facilitar a localização
          </p>
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

        {/* Veículos Envolvidos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-foreground">Veículos Envolvidos</Label>
              <span className="text-xs text-muted-foreground/60">(terceiros)</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleAddVeiculo}
              className="h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Veículo
            </Button>
          </div>
          
          {veiculosEnvolvidos.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-3 border border-dashed border-border/50 rounded-xl">
              Clique em "Adicionar Veículo" para registrar veículos de terceiros envolvidos
            </p>
          )}

          {veiculosEnvolvidos.map((veiculo, index) => (
            <div key={index} className="space-y-3 p-4 rounded-xl border border-border/50 bg-input/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Veículo {index + 1}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveVeiculo(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  id={`veiculo-placa-${index}`}
                  name={`veiculo-placa-${index}`}
                  aria-label={`Placa do veículo ${index + 1}`}
                  placeholder="Placa"
                  value={veiculo.placa}
                  onChange={e => handleVeiculoChange(index, "placa", e.target.value)}
                  className="h-10 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
                />
                <Input
                  id={`veiculo-modelo-${index}`}
                  name={`veiculo-modelo-${index}`}
                  aria-label={`Modelo do veículo ${index + 1}`}
                  placeholder="Modelo"
                  value={veiculo.modelo}
                  onChange={e => handleVeiculoChange(index, "modelo", e.target.value)}
                  className="h-10 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
                />
                <Input
                  id={`veiculo-cor-${index}`}
                  name={`veiculo-cor-${index}`}
                  aria-label={`Cor do veículo ${index + 1}`}
                  placeholder="Cor"
                  value={veiculo.cor}
                  onChange={e => handleVeiculoChange(index, "cor", e.target.value)}
                  className="h-10 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
                />
              </div>
              <Input
                id={`veiculo-observacoes-${index}`}
                name={`veiculo-observacoes-${index}`}
                aria-label={`Observações do veículo ${index + 1}`}
                placeholder="Observações sobre o veículo"
                value={veiculo.observacoes}
                onChange={e => handleVeiculoChange(index, "observacoes", e.target.value)}
                className="h-10 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              />
            </div>
          ))}
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
                id={`testemunha-nome-${index}`}
                name={`testemunha-nome-${index}`}
                aria-label={`Nome da testemunha ${index + 1}`}
                placeholder="Nome"
                value={witness.nome}
                onChange={e => handleWitnessChange(index, "nome", e.target.value)}
                className="flex-1 h-11 bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
              />
              <Input
                id={`testemunha-telefone-${index}`}
                name={`testemunha-telefone-${index}`}
                aria-label={`Telefone da testemunha ${index + 1}`}
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
        <div className="space-y-3">
          <Label htmlFor="descricao" className="text-sm font-medium text-foreground">
            Descrição
          </Label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descreva o ocorrido com detalhes ou use o gravador de áudio abaixo..."
            rows={5}
            className="resize-none bg-input/50 border-border/50 placeholder:text-muted-foreground/50"
            required
          />
          <AudioRecorder
            onTranscription={(text) => setFormData({ ...formData, descricao: text })}
            onAudioReady={(blob) => setAudioBlob(blob)}
            currentText={formData.descricao}
          />
        </div>

        {/* Upload de Fotos - Always Expanded */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-foreground">
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

          <div className="grid grid-cols-2 gap-3">
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

          {imageCount < 4 && (
            <p className="text-xs text-muted-foreground/70 text-center">
              Toque em cada campo para capturar
            </p>
          )}
        </div>

        {/* Informações Complementares - Always Expanded */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-foreground">
              Informações Complementares
            </Label>
            <span className="text-xs text-muted-foreground/60">(opcional)</span>
          </div>

          {/* Document upload buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* B.O. Upload */}
            <label htmlFor="doc-upload-bo" className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
              <FileText className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-center">B.O.</span>
              <input
                id="doc-upload-bo"
                name="doc-upload-bo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleAdditionalDocSelect("bo", e)}
                className="hidden"
              />
            </label>

            {/* CNH Upload */}
            <label htmlFor="doc-upload-cnh" className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
              <FileImage className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-center">CNH</span>
              <input
                id="doc-upload-cnh"
                name="doc-upload-cnh"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleAdditionalDocSelect("cnh", e)}
                className="hidden"
              />
            </label>

            {/* Document Veículo Upload */}
            <label htmlFor="doc-upload-documento-veiculo" className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
              <Car className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-center">Documento Veículo</span>
              <input
                id="doc-upload-documento-veiculo"
                name="doc-upload-documento-veiculo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleAdditionalDocSelect("documento_veiculo", e)}
                className="hidden"
              />
            </label>

            {/* Audio Upload */}
            <label htmlFor="doc-upload-audio" className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/50 bg-input/30 cursor-pointer transition-all">
              <Mic className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-center">Áudio</span>
              <input
                id="doc-upload-audio"
                name="doc-upload-audio"
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
