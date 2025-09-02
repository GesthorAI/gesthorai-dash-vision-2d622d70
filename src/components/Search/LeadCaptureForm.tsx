import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateLead } from "@/hooks/useLeads";
import { 
  UserPlus, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Target,
  Star,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface LeadData {
  name: string;
  business: string;
  city: string;
  phone: string;
  email: string;
  niche: string;
  source: string;
}

export const LeadCaptureForm = () => {
  const [leadData, setLeadData] = useState<LeadData>({
    name: "",
    business: "",
    city: "",
    phone: "",
    email: "",
    niche: "",
    source: "manual"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [customNiche, setCustomNiche] = useState("");
  const [isCustomNiche, setIsCustomNiche] = useState(false);
  const [refreshNiches, setRefreshNiches] = useState(0);

  const { toast } = useToast();
  const createLead = useCreateLead();

  const baseNiches = [
    "Restaurantes", "Academias", "Salões de Beleza", "Clínicas Médicas",
    "Escritórios de Advocacia", "Consultórios Odontológicos", "Pet Shops",
    "Lojas de Roupas", "Farmácias", "Oficinas Mecânicas", "Imobiliárias"
  ];
  
  // Get stored custom niches from localStorage and merge with base niches
  const niches = useMemo(() => {
    const stored = localStorage.getItem('customNiches');
    const customNiches = stored ? JSON.parse(stored) : [];
    return [...baseNiches, ...customNiches];
  }, [refreshNiches]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const sources = [
    { value: "manual", label: "Cadastro Manual" },
    { value: "website", label: "Site da Empresa" },
    { value: "referral", label: "Indicação" },
    { value: "cold_call", label: "Ligação Fria" },
    { value: "networking", label: "Networking" },
    { value: "social_media", label: "Redes Sociais" },
    { value: "email_campaign", label: "Campanha de Email" }
  ];

  // Calculate preview score using useMemo
  const calculatedScore = useMemo(() => {
    if (!leadData.name || !leadData.business || !leadData.city) return 0;
    
    // Simple scoring logic
    let score = 0;
    if (leadData.phone && leadData.email) score += 3;
    else if (leadData.phone || leadData.email) score += 2;
    if (leadData.niche) score += 2;
    if (leadData.city) score += 2;
    if (leadData.business) score += 3;
    
    return Math.min(score, 10);
  }, [leadData]);

  const handleInputChange = (field: keyof LeadData, value: string) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setLeadData(prev => ({ ...prev, [field]: value }));
    
    // Update preview score
    if (leadData.name && leadData.business && leadData.city) {
      setPreviewScore(calculatedScore);
    }
  };

  const handleNicheChange = (value: string) => {
    if (value === "custom") {
      setIsCustomNiche(true);
      setCustomNiche("");
    } else {
      setIsCustomNiche(false);
      setCustomNiche("");
      handleInputChange('niche', value);
    }
  };

  const handleCustomNicheSubmit = () => {
    if (customNiche.trim()) {
      // Save to localStorage
      const stored = localStorage.getItem('customNiches');
      const existingNiches = stored ? JSON.parse(stored) : [];
      if (!existingNiches.includes(customNiche.trim())) {
        const newNiches = [...existingNiches, customNiche.trim()];
        localStorage.setItem('customNiches', JSON.stringify(newNiches));
        // Force niches list to refresh
        setRefreshNiches(prev => prev + 1);
      }
      
      handleInputChange('niche', customNiche.trim());
      setIsCustomNiche(false);
      setCustomNiche("");
    }
  };

  const validateForm = (): string | null => {
    if (!leadData.name.trim()) return "Nome é obrigatório";
    if (!leadData.business.trim()) return "Nome do negócio é obrigatório";
    if (!leadData.city.trim()) return "Cidade é obrigatória";
    if (!leadData.phone.trim() && !leadData.email.trim()) {
      return "Pelo menos um contato (telefone ou email) é obrigatório";
    }
    if (leadData.phone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(leadData.phone)) {
      // Simple phone format validation - adjust as needed
      if (!/^\d+$/.test(leadData.phone.replace(/\D/g, ''))) {
        return "Formato de telefone inválido";
      }
    }
    if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      return "Formato de email inválido";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Erro de validação",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createLead.mutateAsync({
        name: leadData.name,
        business: leadData.business,
        city: leadData.city,
        phone: leadData.phone || undefined,
        email: leadData.email || undefined,
        niche: leadData.niche || undefined,
        source: leadData.source,
        status: "novo",
        score: calculatedScore
      });

      if (result.isDuplicate) {
        toast({
          title: "Lead já existe",
          description: `${leadData.name} já está cadastrado no sistema`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Lead cadastrado com sucesso!",
        description: `${leadData.name} foi adicionado com score ${calculatedScore}/10`,
      });

      // Reset form
      setLeadData({
        name: "",
        business: "",
        city: "",
        phone: "",
        email: "",
        niche: "",
        source: "manual"
      });
      setPreviewScore(null);

    } catch (error: any) {
      console.error('Error creating lead:', error);
      
      let errorMessage = "Não foi possível salvar o lead. Tente novamente.";
      
      // Handle specific error cases
      if (error?.code === '23505') {
        errorMessage = "Este lead já existe no sistema.";
      } else if (error?.message?.includes('400') || error?.status === 400) {
        errorMessage = "Dados inválidos. Verifique as informações e tente novamente.";
      }
      
      toast({
        title: "Erro ao cadastrar lead",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excelente";
    if (score >= 6) return "Bom";
    if (score >= 4) return "Médio";
    return "Baixo";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Cadastrar Novo Lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contato *</Label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={leadData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business">Nome do Negócio *</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="business"
                placeholder="Ex: Restaurante Bom Sabor"
                value={leadData.business}
                onChange={(e) => handleInputChange('business', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Location and Niche */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="city"
                placeholder="Ex: São Paulo"
                value={leadData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="niche">Nicho</Label>
            {isCustomNiche ? (
              <div className="flex gap-2">
                <Input
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder="Digite o nicho personalizado"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomNicheSubmit()}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCustomNicheSubmit}
                  disabled={!customNiche.trim()}
                >
                  OK
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {setIsCustomNiche(false); setCustomNiche("");}}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select value={leadData.niche} onValueChange={handleNicheChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um nicho" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                  ))}
                  <SelectItem value="custom">+ Adicionar nicho personalizado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={leadData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="contato@empresa.com"
                value={leadData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label htmlFor="source">Origem do Lead</Label>
          <Select value={leadData.source} onValueChange={(value) => handleInputChange('source', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Score Preview */}
        {calculatedScore > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Star className={`h-5 w-5 ${getScoreColor(calculatedScore)}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${getScoreColor(calculatedScore)}`}>
                    {calculatedScore.toFixed(1)}
                  </span>
                  <Badge variant={calculatedScore >= 7 ? "default" : calculatedScore >= 4 ? "secondary" : "destructive"}>
                    {getScoreLabel(calculatedScore)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Score previsto baseado nas informações fornecidas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Messages */}
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {leadData.name && leadData.business && leadData.city ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              {leadData.name && leadData.business && leadData.city
                ? "Informações básicas completas"
                : "Preencha nome, negócio e cidade"
              }
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {leadData.phone || leadData.email ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <span>
              {leadData.phone || leadData.email
                ? "Informação de contato fornecida"
                : "Adicione pelo menos telefone ou email"
              }
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <UserPlus className="h-4 w-4 mr-2 animate-spin" />
              Cadastrando lead...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar Lead
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};