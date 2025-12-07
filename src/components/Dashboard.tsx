import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Calendar, User, AlertTriangle, ExternalLink, LogOut, Download, Filter, ChevronDown, ChevronUp, Save, Car, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FunnelChart } from "./FunnelChart";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Sinistro {
  id: number;
  protocolo: string;
  data_hora: string;
  local_acidente: string;
  onibus: string;
  motorista: string;
  chapa: string;
  responsabilidade: string;
  descricao: string;
  status?: string;
  analista?: string;
  parecer_analista?: string;
  prioridade?: string;
  data_ocorrencia?: string;
  observacoes_complementares?: string;
}

interface Testemunha {
  nome: string;
  telefone: string;
}

interface Imagem {
  url_publica: string;
  nome_arquivo: string;
}

interface VeiculoEnvolvido {
  id: number;
  placa: string;
  modelo: string;
  cor: string;
  observacoes: string;
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  aguardando_documentos: "Aguardando Docs",
  concluido: "Concluído"
};

const statusColors: Record<string, string> = {
  novo: "bg-blue-500",
  em_analise: "bg-amber-500",
  aguardando_documentos: "bg-orange-500",
  concluido: "bg-green-500"
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente"
};

export const Dashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [sinistros, setSinistros] = useState<Sinistro[]>([]);
  const [filteredSinistros, setFilteredSinistros] = useState<Sinistro[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSinistro, setSelectedSinistro] = useState<Sinistro | null>(null);
  const [testemunhas, setTestemunhas] = useState<Testemunha[]>([]);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoEnvolvido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showFunnel, setShowFunnel] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterResponsabilidade, setFilterResponsabilidade] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  
  // Edit state for analysis
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState({
    status: "",
    analista: "",
    parecer_analista: "",
    prioridade: ""
  });

  useEffect(() => {
    fetchSinistros();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, sinistros, filterStatus, filterResponsabilidade, filterDateFrom, filterDateTo]);

  const applyFilters = () => {
    let filtered = [...sinistros];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.local_acidente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.motorista.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(s => s.status === filterStatus);
    }
    
    // Responsabilidade filter
    if (filterResponsabilidade !== "all") {
      filtered = filtered.filter(s => s.responsabilidade === filterResponsabilidade);
    }
    
    // Date filter
    if (filterDateFrom) {
      filtered = filtered.filter(s => new Date(s.data_hora) >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter(s => new Date(s.data_hora) <= filterDateTo);
    }
    
    setFilteredSinistros(filtered);
  };

  const fetchSinistros = async () => {
    try {
      const { data, error } = await supabase
        .from("sinistros")
        .select("*")
        .order("data_hora", { ascending: false });

      if (error) throw error;
      setSinistros(data || []);
      setFilteredSinistros(data || []);
    } catch (error) {
      console.error("Error fetching sinistros:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetalhes = async (sinistroId: number) => {
    try {
      const [testemunhasRes, imagensRes, veiculosRes] = await Promise.all([
        supabase.from("testemunhas").select("*").eq("sinistro_id", sinistroId),
        supabase.from("imagens").select("*").eq("sinistro_id", sinistroId),
        supabase.from("veiculos_envolvidos").select("*").eq("sinistro_id", sinistroId),
      ]);

      setTestemunhas(testemunhasRes.data || []);
      setImagens(imagensRes.data || []);
      setVeiculos(veiculosRes.data || []);
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };

  const handleViewDetails = (sinistro: Sinistro) => {
    setSelectedSinistro(sinistro);
    setAnalysisData({
      status: sinistro.status || "novo",
      analista: sinistro.analista || "",
      parecer_analista: sinistro.parecer_analista || "",
      prioridade: sinistro.prioridade || "media"
    });
    setEditingAnalysis(false);
    fetchDetalhes(sinistro.id);
  };

  const handleSaveAnalysis = async () => {
    if (!selectedSinistro) return;
    
    try {
      const { error } = await supabase
        .from("sinistros")
        .update({
          status: analysisData.status,
          analista: analysisData.analista,
          parecer_analista: analysisData.parecer_analista,
          prioridade: analysisData.prioridade,
          data_conclusao: analysisData.status === "concluido" ? new Date().toISOString() : null
        })
        .eq("id", selectedSinistro.id);
      
      if (error) throw error;
      
      toast.success("Análise salva com sucesso");
      setEditingAnalysis(false);
      
      // Update local state
      setSinistros(prev => prev.map(s => 
        s.id === selectedSinistro.id 
          ? { ...s, ...analysisData }
          : s
      ));
      setSelectedSinistro(prev => prev ? { ...prev, ...analysisData } : null);
    } catch (error) {
      console.error("Error saving analysis:", error);
      toast.error("Erro ao salvar análise");
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Ocorrências", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
    
    // Table data
    const tableData = filteredSinistros.map(s => [
      s.protocolo,
      format(new Date(s.data_hora), "dd/MM/yyyy", { locale: ptBR }),
      s.motorista,
      s.onibus,
      s.responsabilidade,
      statusLabels[s.status || "novo"] || s.status
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [["Protocolo", "Data", "Motorista", "Ônibus", "Responsab.", "Status"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`ocorrencias_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const exportSingleToPDF = () => {
    if (!selectedSinistro) return;
    
    const doc = new jsPDF();
    const s = selectedSinistro;
    
    // Header
    doc.setFontSize(18);
    doc.text("Detalhes da Ocorrência", 14, 22);
    doc.setFontSize(12);
    doc.text(`Protocolo: ${s.protocolo}`, 14, 32);
    
    // Info
    doc.setFontSize(10);
    let y = 45;
    
    const addLine = (label: string, value: string) => {
      doc.setFont(undefined, "bold");
      doc.text(`${label}:`, 14, y);
      doc.setFont(undefined, "normal");
      doc.text(value || "N/A", 50, y);
      y += 8;
    };
    
    addLine("Data", format(new Date(s.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR }));
    addLine("Local", s.local_acidente);
    addLine("Motorista", s.motorista);
    addLine("Chapa", s.chapa);
    addLine("Ônibus", s.onibus);
    addLine("Responsabilidade", s.responsabilidade);
    addLine("Status", statusLabels[s.status || "novo"] || s.status || "Novo");
    addLine("Prioridade", prioridadeLabels[s.prioridade || "media"] || s.prioridade);
    addLine("Analista", s.analista || "Não atribuído");
    
    y += 5;
    doc.setFont(undefined, "bold");
    doc.text("Descrição:", 14, y);
    y += 6;
    doc.setFont(undefined, "normal");
    const descLines = doc.splitTextToSize(s.descricao, 180);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 10;
    
    if (s.parecer_analista) {
      doc.setFont(undefined, "bold");
      doc.text("Parecer do Analista:", 14, y);
      y += 6;
      doc.setFont(undefined, "normal");
      const parecerLines = doc.splitTextToSize(s.parecer_analista, 180);
      doc.text(parecerLines, 14, y);
    }
    
    doc.save(`ocorrencia_${s.protocolo}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  // Funnel chart data
  const funnelData = [
    { label: "Concluídos", value: sinistros.filter(s => s.status === "concluido").length, color: "hsl(142, 76%, 36%)" },
    { label: "Aguardando Docs", value: sinistros.filter(s => s.status === "aguardando_documentos").length, color: "hsl(25, 95%, 53%)" },
    { label: "Em Análise", value: sinistros.filter(s => s.status === "em_analise").length, color: "hsl(45, 93%, 47%)" },
    { label: "Novos", value: sinistros.filter(s => !s.status || s.status === "novo").length, color: "hsl(217, 91%, 60%)" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Dashboard de Gestão</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Sistema de Controle de Ocorrências</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF} className="text-xs sm:text-sm">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout} className="text-xs sm:text-sm">
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold">{sinistros.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Novos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-blue-500">
                {sinistros.filter(s => !s.status || s.status === "novo").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Em Análise</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-amber-500">
                {sinistros.filter(s => s.status === "em_analise").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-green-500">
                {sinistros.filter(s => s.status === "concluido").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Chart Section */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFunnel(!showFunnel)}
            className="w-full justify-between text-xs sm:text-sm"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Análise em Funil (BI)
            </span>
            {showFunnel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showFunnel && (
            <FunnelChart data={funnelData} title="Funil de Status das Ocorrências" />
          )}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-4 px-3 sm:px-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar protocolo, local ou motorista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-accent", "shrink-0")}
                size="icon"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="aguardando_documentos">Aguardando Docs</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Responsabilidade</Label>
                  <Select value={filterResponsabilidade} onValueChange={setFilterResponsabilidade}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="motorista">Motorista</SelectItem>
                      <SelectItem value="terceiro">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !filterDateFrom && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDateFrom ? format(filterDateFrom, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={filterDateFrom}
                        onSelect={setFilterDateFrom}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !filterDateTo && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDateTo ? format(filterDateTo, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={filterDateTo}
                        onSelect={setFilterDateTo}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidents List */}
        <div className="space-y-3">
          {filteredSinistros.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma ocorrência encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredSinistros.map((sinistro) => (
              <Card key={sinistro.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewDetails(sinistro)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-semibold text-primary">
                          {sinistro.protocolo}
                        </span>
                        <Badge variant="outline" className={cn("text-xs text-white", statusColors[sinistro.status || "novo"])}>
                          {statusLabels[sinistro.status || "novo"]}
                        </Badge>
                        {sinistro.prioridade === "urgente" && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{format(new Date(sinistro.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{sinistro.motorista}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Ônibus: {sinistro.onibus}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{sinistro.local_acidente}</p>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="shrink-0 self-start">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSinistro} onOpenChange={() => setSelectedSinistro(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-base sm:text-lg">Detalhes da Ocorrência</span>
              {selectedSinistro && (
                <span className="font-mono text-xs sm:text-sm text-primary">{selectedSinistro.protocolo}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            {selectedSinistro && (
              <div className="px-4 sm:px-6 pb-6 space-y-4 sm:space-y-6">
                {/* Status Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-white", statusColors[selectedSinistro.status || "novo"])}>
                    {statusLabels[selectedSinistro.status || "novo"]}
                  </Badge>
                  <Badge variant="outline">
                    {prioridadeLabels[selectedSinistro.prioridade || "media"]}
                  </Badge>
                  <Badge variant="outline">
                    {selectedSinistro.responsabilidade === "motorista" ? "Resp: Motorista" : "Resp: Terceiro"}
                  </Badge>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Data do Registro</Label>
                      <p className="text-sm font-medium">{format(new Date(selectedSinistro.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                    {selectedSinistro.data_ocorrencia && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Data da Ocorrência</Label>
                        <p className="text-sm font-medium">{format(new Date(selectedSinistro.data_ocorrencia), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Local</Label>
                      <p className="text-sm font-medium">{selectedSinistro.local_acidente}</p>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Motorista</Label>
                      <p className="text-sm font-medium">{selectedSinistro.motorista}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Chapa</Label>
                      <p className="text-sm font-medium">{selectedSinistro.chapa || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ônibus</Label>
                      <p className="text-sm font-medium">{selectedSinistro.onibus}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedSinistro.descricao}</p>
                </div>

                {/* Vehicles Involved */}
                {veiculos.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Veículos Envolvidos ({veiculos.length})</Label>
                    <div className="space-y-2">
                      {veiculos.map((v, i) => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {v.modelo || "Veículo"} {v.cor && `- ${v.cor}`}
                            </p>
                            {v.placa && <p className="text-xs text-muted-foreground">Placa: {v.placa}</p>}
                            {v.observacoes && <p className="text-xs text-muted-foreground mt-1">{v.observacoes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Witnesses */}
                {testemunhas.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Testemunhas ({testemunhas.length})</Label>
                    <div className="space-y-2">
                      {testemunhas.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.nome}</p>
                            {t.telefone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {t.telefone}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {imagens.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Fotografias ({imagens.length})</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {imagens.map((img, i) => (
                        <a
                          key={i}
                          href={img.url_publica}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={img.url_publica}
                            alt={img.nome_arquivo}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedSinistro.observacoes_complementares && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações Complementares</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedSinistro.observacoes_complementares}</p>
                  </div>
                )}

                {/* Analysis Section */}
                <div className="border-t pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-semibold">Análise do Gestor</Label>
                    {!editingAnalysis ? (
                      <Button size="sm" variant="outline" onClick={() => setEditingAnalysis(true)} className="text-xs">
                        Editar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleSaveAnalysis} className="text-xs">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Salvar
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      {editingAnalysis ? (
                        <Select value={analysisData.status} onValueChange={(v) => setAnalysisData({...analysisData, status: v})}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="em_analise">Em Análise</SelectItem>
                            <SelectItem value="aguardando_documentos">Aguardando Docs</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{statusLabels[analysisData.status] || analysisData.status}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Prioridade</Label>
                      {editingAnalysis ? (
                        <Select value={analysisData.prioridade} onValueChange={(v) => setAnalysisData({...analysisData, prioridade: v})}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{prioridadeLabels[analysisData.prioridade] || analysisData.prioridade}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Analista Responsável</Label>
                      {editingAnalysis ? (
                        <Input
                          value={analysisData.analista}
                          onChange={(e) => setAnalysisData({...analysisData, analista: e.target.value})}
                          placeholder="Nome do analista"
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm">{analysisData.analista || "Não atribuído"}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Parecer</Label>
                      {editingAnalysis ? (
                        <Textarea
                          value={analysisData.parecer_analista}
                          onChange={(e) => setAnalysisData({...analysisData, parecer_analista: e.target.value})}
                          placeholder="Digite o parecer da análise..."
                          rows={4}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg min-h-[80px]">
                          {analysisData.parecer_analista || "Nenhum parecer registrado"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button onClick={exportSingleToPDF} variant="outline" className="flex-1 text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button onClick={() => setSelectedSinistro(null)} variant="outline" className="flex-1 text-sm">
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
