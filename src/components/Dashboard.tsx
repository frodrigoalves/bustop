import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Calendar, User, AlertTriangle, ExternalLink, LogOut, Download, Filter, ChevronDown, ChevronUp, Save } from "lucide-react";
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
      const [testemunhasRes, imagensRes] = await Promise.all([
        supabase.from("testemunhas").select("*").eq("sinistro_id", sinistroId),
        supabase.from("imagens").select("*").eq("sinistro_id", sinistroId),
      ]);

      setTestemunhas(testemunhasRes.data || []);
      setImagens(imagensRes.data || []);
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard de Gestão</h1>
              <p className="text-sm text-muted-foreground">Sistema de Controle de Ocorrências</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ocorrências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sinistros.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                {sinistros.filter(s => !s.status || s.status === "novo").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">
                {sinistros.filter(s => s.status === "em_analise").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
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
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
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
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por protocolo, local ou motorista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-accent")}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t animate-fade-in">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
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
                  <Label>Responsabilidade</Label>
                  <Select value={filterResponsabilidade} onValueChange={setFilterResponsabilidade}>
                    <SelectTrigger>
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
                  <Label>Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filterDateFrom && "text-muted-foreground")}>
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
                  <Label>Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filterDateTo && "text-muted-foreground")}>
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

        {/* Lista de Sinistros */}
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências Registradas ({filteredSinistros.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredSinistros.map((sinistro) => (
                  <Card key={sinistro.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6" onClick={() => handleViewDetails(sinistro)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              {sinistro.protocolo}
                            </Badge>
                            <Badge className={`${statusColors[sinistro.status || "novo"]} text-white`}>
                              {statusLabels[sinistro.status || "novo"]}
                            </Badge>
                            <Badge variant="secondary" className="capitalize">
                              {sinistro.responsabilidade}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(sinistro.data_hora).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{sinistro.motorista}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>Ônibus {sinistro.onibus}</span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {sinistro.local_acidente}
                          </p>
                        </div>

                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredSinistros.length === 0 && (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma ocorrência encontrada</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedSinistro} onOpenChange={() => setSelectedSinistro(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                Detalhes da Ocorrência
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedSinistro?.protocolo}
                </Badge>
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={exportSingleToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[70vh]">
            {selectedSinistro && (
              <div className="space-y-6 pr-4">
                {/* Informações Básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações do Incidente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Data/Hora:</span>
                        <p className="text-muted-foreground">
                          {new Date(selectedSinistro.data_hora).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Responsabilidade:</span>
                        <p className="text-muted-foreground capitalize">{selectedSinistro.responsabilidade}</p>
                      </div>
                      <div>
                        <span className="font-medium">Ônibus:</span>
                        <p className="text-muted-foreground">{selectedSinistro.onibus}</p>
                      </div>
                      <div>
                        <span className="font-medium">Chapa:</span>
                        <p className="text-muted-foreground">{selectedSinistro.chapa || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Motorista:</span>
                      <p className="text-muted-foreground">{selectedSinistro.motorista}</p>
                    </div>
                    <div>
                      <span className="font-medium">Local:</span>
                      <p className="text-muted-foreground">{selectedSinistro.local_acidente}</p>
                    </div>
                    <div>
                      <span className="font-medium">Descrição:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedSinistro.descricao}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Análise e Acompanhamento */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Análise e Acompanhamento</CardTitle>
                    {!editingAnalysis ? (
                      <Button variant="outline" size="sm" onClick={() => setEditingAnalysis(true)}>
                        Editar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleSaveAnalysis}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editingAnalysis ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                              value={analysisData.status} 
                              onValueChange={(v) => setAnalysisData(prev => ({ ...prev, status: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">Novo</SelectItem>
                                <SelectItem value="em_analise">Em Análise</SelectItem>
                                <SelectItem value="aguardando_documentos">Aguardando Documentos</SelectItem>
                                <SelectItem value="concluido">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Prioridade</Label>
                            <Select 
                              value={analysisData.prioridade} 
                              onValueChange={(v) => setAnalysisData(prev => ({ ...prev, prioridade: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="baixa">Baixa</SelectItem>
                                <SelectItem value="media">Média</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="urgente">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Analista Responsável</Label>
                          <Input
                            value={analysisData.analista}
                            onChange={(e) => setAnalysisData(prev => ({ ...prev, analista: e.target.value }))}
                            placeholder="Nome do analista"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Parecer da Análise</Label>
                          <Textarea
                            value={analysisData.parecer_analista}
                            onChange={(e) => setAnalysisData(prev => ({ ...prev, parecer_analista: e.target.value }))}
                            placeholder="Insira o parecer da análise..."
                            rows={4}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Status:</span>
                            <div className="mt-1">
                              <Badge className={`${statusColors[selectedSinistro.status || "novo"]} text-white`}>
                                {statusLabels[selectedSinistro.status || "novo"]}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Prioridade:</span>
                            <p className="text-muted-foreground capitalize">
                              {prioridadeLabels[selectedSinistro.prioridade || "media"]}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Analista:</span>
                          <p className="text-muted-foreground">{selectedSinistro.analista || "Não atribuído"}</p>
                        </div>
                        <div>
                          <span className="font-medium">Parecer:</span>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {selectedSinistro.parecer_analista || "Nenhum parecer registrado"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Testemunhas */}
                {testemunhas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Testemunhas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {testemunhas.map((testemunha, index) => (
                          <div key={index} className="flex justify-between text-sm p-2 border rounded">
                            <span>{testemunha.nome}</span>
                            <span className="text-muted-foreground">{testemunha.telefone}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fotos */}
                {imagens.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Fotos da Ocorrência</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imagens.map((imagem, index) => (
                          <a
                            key={index}
                            href={imagem.url_publica}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={imagem.url_publica}
                              alt={imagem.nome_arquivo}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};