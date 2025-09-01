import { useMemo } from 'react';
import { Lead } from './useLeads';
import { useAILeadScores } from './useAILeadScoring';

export interface ScoringCriteria {
  hasPhone: number;
  hasEmail: number;
  businessQuality: number;
  cityScore: number;
  nicheScore: number;
  responseTime: number;
  engagementLevel: number;
  whatsappQuality: number;
  sourceQuality: number;
  dataCompleteness: number;
  leadAge: number;
}

export interface ScoringWeights {
  contactInfo: number;
  businessProfile: number;
  location: number;
  niche: number;
  engagement: number;
  whatsapp: number;
  dataQuality: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  contactInfo: 0.20,     // 20% - Informações de contato
  businessProfile: 0.25, // 25% - Qualidade do perfil do negócio
  location: 0.12,        // 12% - Localização/cidade
  niche: 0.15,          // 15% - Nicho/segmento
  engagement: 0.15,      // 15% - Nível de engajamento
  whatsapp: 0.08,       // 8% - Qualidade WhatsApp
  dataQuality: 0.05      // 5% - Completude dos dados
};

// High-value cities with population-based scoring
const CITY_SCORES: Record<string, number> = {
  // Tier 1 Cities (10 points)
  'São Paulo': 10, 'Rio de Janeiro': 10, 'Brasília': 10,
  
  // Tier 2 Cities (9 points)  
  'Belo Horizonte': 9, 'Porto Alegre': 9, 'Salvador': 9, 'Curitiba': 9,
  'Fortaleza': 9, 'Recife': 9, 'Campinas': 9, 'Goiânia': 9,
  
  // Tier 3 Cities (8 points)
  'Guarulhos': 8, 'Nova Iguaçu': 8, 'Belém': 8, 'São Bernardo do Campo': 8,
  'Duque de Caxias': 8, 'Santo André': 8, 'São José dos Campos': 8,
  
  // Default for unlisted cities
  'default': 6
};

// Enhanced niche scoring with market value
const NICHE_SCORES: Record<string, number> = {
  // High-value niches (10 points)
  'Advocacia': 10, 'Medicina': 10, 'Odontologia': 10, 'Clínicas': 10,
  'Contabilidade': 10, 'Consultorias': 10, 'Imobiliárias': 10,
  'Seguros': 10, 'Financeiro': 10, 'Corretoras': 10,
  
  // Medium-high value niches (8 points)
  'Restaurantes': 8, 'Academias': 8, 'Salões de Beleza': 8, 'Oficinas': 8,
  'Escolas': 8, 'Arquitetura': 8, 'Engenharia': 8, 'Marketing': 8,
  
  // Medium value niches (6 points)
  'Comércio': 6, 'Varejo': 6, 'Serviços': 6, 'Tecnologia': 6,
  
  // Default for unlisted niches
  'default': 5
};

// Lead source quality scoring
const SOURCE_SCORES: Record<string, number> = {
  'website': 10,     // Own website - highest quality
  'landing': 9,      // Landing page
  'google': 9,       // Google Ads/Organic
  'facebook': 8,     // Facebook/Instagram
  'referral': 9,     // Referrals
  'import': 7,       // Imported data
  'webhook': 8,      // API/Webhook
  'manual': 6,       // Manual entry
  'default': 5       // Unknown source
};

export const useLeadScoring = (leads: Lead[], customWeights?: Partial<ScoringWeights>) => {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  
  // Get AI scores for all leads
  const leadIds = leads.map(lead => lead.id);
  const { data: aiScores = [] } = useAILeadScores(leadIds);
  
  // Create a map for quick AI score lookup
  const aiScoreMap = useMemo(() => {
    const map = new Map();
    aiScores.forEach(score => {
      map.set(score.lead_id, score);
    });
    return map;
  }, [aiScores]);

  const scoredLeads = useMemo(() => {
    return leads.map(lead => {
      // Check if we have a recent AI score (less than 7 days old)
      const aiScore = aiScoreMap.get(lead.id);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const hasRecentAIScore = aiScore && new Date(aiScore.created_at) > sevenDaysAgo;
      
      if (hasRecentAIScore) {
        // Use AI score
        return {
          ...lead,
          score: aiScore.score,
          scoreSource: 'ai' as const,
          aiRationale: aiScore.rationale,
          aiConfidence: aiScore.confidence,
          aiModel: aiScore.model,
          aiScoredAt: aiScore.created_at,
          scoringBreakdown: null
        };
      } else {
        // Fallback to heuristic score
        const criteria = calculateScoringCriteria(lead);
        const heuristicScore = calculateWeightedScore(criteria, weights);
        
        return {
          ...lead,
          score: Math.round(heuristicScore * 10) / 10,
          scoreSource: 'heuristic' as const,
          scoringBreakdown: {
            criteria,
            weights,
            totalScore: heuristicScore
          }
        };
      }
    });
  }, [leads, aiScoreMap, weights]);

  const scoringStats = useMemo(() => {
    if (scoredLeads.length === 0) return null;

    const scores = scoredLeads.map(lead => lead.score);
    const aiScores = scoredLeads.filter(lead => lead.scoreSource === 'ai').map(lead => lead.score);
    const heuristicScores = scoredLeads.filter(lead => lead.scoreSource === 'heuristic').map(lead => lead.score);
    
    const calculateStats = (scoreArray: number[]) => ({
      average: scoreArray.length > 0 ? scoreArray.reduce((sum, score) => sum + score, 0) / scoreArray.length : 0,
      min: scoreArray.length > 0 ? Math.min(...scoreArray) : 0,
      max: scoreArray.length > 0 ? Math.max(...scoreArray) : 0,
      count: scoreArray.length
    });

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // Score distribution
    const distribution = {
      excellent: scoredLeads.filter(lead => lead.score >= 8).length,
      good: scoredLeads.filter(lead => lead.score >= 6 && lead.score < 8).length,
      fair: scoredLeads.filter(lead => lead.score >= 4 && lead.score < 6).length,
      poor: scoredLeads.filter(lead => lead.score < 4).length
    };

    // AI coverage percentage
    const aiCoverage = scores.length > 0 ? (aiScores.length / scores.length) * 100 : 0;

    return {
      avgScore,
      maxScore,
      minScore,
      distribution,
      aiCoverage,
      ai: calculateStats(aiScores),
      heuristic: calculateStats(heuristicScores),
      totalLeads: scoredLeads.length
    };
  }, [scoredLeads]);

  return {
    scoredLeads,
    scoringStats,
    rescore: (newWeights: Partial<ScoringWeights>) => {
      // This would trigger a re-render with new weights
      return useLeadScoring(leads, newWeights);
    }
  };
};

function calculateScoringCriteria(lead: Lead): ScoringCriteria {
  // Contact Information Score (enhanced)
  const hasPhone = calculatePhoneScore(lead.phone);
  const hasEmail = calculateEmailScore(lead.email);

  // Business Quality Score (enhanced with name analysis)
  const businessQuality = calculateBusinessQuality(lead.business);

  // City Score (enhanced with population-based scoring)
  const cityScore = calculateCityScore(lead.city);

  // Niche Score (enhanced with market value analysis)
  const nicheScore = calculateNicheScore(lead.niche);

  // Response Time Score (based on lead freshness and status)
  const responseTime = calculateResponseTimeScore(lead);

  // Engagement Level (based on status progression and interactions)
  const engagementLevel = calculateEngagementScore(lead);

  // WhatsApp Quality Score (new)
  const whatsappQuality = calculateWhatsAppScore(lead);

  // Source Quality Score (new)
  const sourceQuality = calculateSourceScore(lead.source);

  // Data Completeness Score (new)
  const dataCompleteness = calculateDataCompletenessScore(lead);

  // Lead Age Score (new)
  const leadAge = calculateLeadAgeScore(lead);

  return {
    hasPhone,
    hasEmail,
    businessQuality,
    cityScore,
    nicheScore,
    responseTime,
    engagementLevel,
    whatsappQuality,
    sourceQuality,
    dataCompleteness,
    leadAge
  };
}

// Enhanced phone scoring
function calculatePhoneScore(phone: string | null): number {
  if (!phone || !phone.trim()) return 0;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone validation and scoring
  if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
    let score = 8; // Base score for valid phone
    
    // Bonus for mobile numbers (11 digits with area code)
    if (cleanPhone.length === 11 && ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28'].includes(cleanPhone.substring(0, 2))) {
      score += 2;
    }
    
    return score;
  }
  
  return 3; // Invalid format but has something
}

// Enhanced email scoring
function calculateEmailScore(email: string | null): number {
  if (!email || !email.trim()) return 0;
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 2;
  
  let score = 7; // Base score for valid email
  
  // Bonus for business domains
  const businessDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (domain && !businessDomains.includes(domain)) {
    score += 3; // Likely business email
  }
  
  return score;
}

// Enhanced city scoring
function calculateCityScore(city: string): number {
  return CITY_SCORES[city] || CITY_SCORES['default'];
}

// Enhanced niche scoring
function calculateNicheScore(niche: string | null): number {
  if (!niche) return 5; // Neutral for missing niche
  return NICHE_SCORES[niche] || NICHE_SCORES['default'];
}

// Enhanced business quality scoring
function calculateBusinessQuality(businessName: string): number {
  if (!businessName || businessName.trim().length < 3) return 2;
  
  let score = 5; // Base score
  
  // Length indicates establishment
  if (businessName.length > 30) score += 2;
  else if (businessName.length > 15) score += 1.5;
  else if (businessName.length > 8) score += 1;
  
  // Professional indicators
  const professionalTerms = [
    'ltda', 'ltd', 'me', 'eireli', 'sa', 's.a.', 'clinic', 'center', 'instituto',
    'consultoria', 'assessoria', 'serviços', 'solutions', 'group', 'grupo',
    'associados', 'advogados', 'contadores', 'drª', 'dr.', 'doutor'
  ];
  
  const hasProfessionalTerm = professionalTerms.some(term => 
    businessName.toLowerCase().includes(term)
  );
  if (hasProfessionalTerm) score += 2;
  
  // Check for complete business structure (Name + Type)
  const hasBusinessStructure = /\b(ltda|ltd|me|eireli|sa|s\.a\.)\b/i.test(businessName);
  if (hasBusinessStructure) score += 1;
  
  // Penalize suspicious patterns
  const suspiciousPatterns = ['test', 'teste', 'exemplo', 'sample', 'demo', 'temp', 'temporario'];
  const isSuspicious = suspiciousPatterns.some(pattern => 
    businessName.toLowerCase().includes(pattern)
  );
  if (isSuspicious) score = Math.max(score - 4, 1);
  
  // Bonus for proper capitalization
  const isProperlyCapitalized = /^[A-Z]/.test(businessName) && !/^[A-Z\s]+$/.test(businessName);
  if (isProperlyCapitalized) score += 0.5;
  
  return Math.min(score, 10);
}

// New WhatsApp quality scoring
function calculateWhatsAppScore(lead: Lead): number {
  if (!lead.whatsapp_verified && !lead.whatsapp_exists) return 5; // Unknown
  
  let score = 5;
  
  if (lead.whatsapp_verified === true) score += 4; // Verified WhatsApp
  if (lead.whatsapp_exists === true) score += 2;   // Exists but not verified
  if (lead.whatsapp_number && lead.whatsapp_number.trim()) score += 1; // Has number
  
  // Bonus if WhatsApp matches phone
  if (lead.phone && lead.whatsapp_number) {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const cleanWhatsApp = lead.whatsapp_number.replace(/\D/g, '');
    if (cleanPhone === cleanWhatsApp) score += 1;
  }
  
  return Math.min(score, 10);
}

// New source quality scoring
function calculateSourceScore(source: string | null): number {
  if (!source) return SOURCE_SCORES['default'];
  return SOURCE_SCORES[source.toLowerCase()] || SOURCE_SCORES['default'];
}

// New data completeness scoring
function calculateDataCompletenessScore(lead: Lead): number {
  const fields = [
    lead.name, lead.business, lead.city, lead.phone, 
    lead.email, lead.niche, lead.source
  ];
  
  const filledFields = fields.filter(field => field && field.toString().trim()).length;
  const completeness = (filledFields / fields.length) * 10;
  
  // Bonus for having both phone and email
  if (lead.phone && lead.email) return Math.min(completeness + 1, 10);
  
  return completeness;
}

// New lead age scoring (fresher leads score higher)
function calculateLeadAgeScore(lead: Lead): number {
  const createdAt = new Date(lead.created_at);
  const now = new Date();
  const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreated < 1) return 10;      // Ultra fresh
  if (hoursSinceCreated < 6) return 9;       // Very fresh
  if (hoursSinceCreated < 24) return 8;      // Fresh (same day)
  if (hoursSinceCreated < 72) return 6;      // Recent (3 days)
  if (hoursSinceCreated < 168) return 4;     // Week old
  if (hoursSinceCreated < 720) return 2;     // Month old
  return 1; // Old leads
}

// Enhanced response time scoring
function calculateResponseTimeScore(lead: Lead): number {
  // If lead hasn't been contacted yet, score based on freshness
  if (lead.status === 'novo') {
    const createdAt = new Date(lead.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreated < 1) return 10;      // Immediate response needed
    if (hoursSinceCreated < 4) return 9;       // Quick response needed
    if (hoursSinceCreated < 12) return 7;      // Same day response
    if (hoursSinceCreated < 24) return 6;      // Next day response
    if (hoursSinceCreated < 72) return 4;      // Within 3 days
    return 2; // Delayed response
  }
  
  // Enhanced status-based scoring
  const statusScores: Record<string, number> = {
    'contato': 7,
    'contatado': 7,
    'qualificado': 8,
    'agendado': 9,
    'proposta': 9,
    'convertido': 10,
    'fechado': 10,
    'perdido': 3,
    'cancelado': 2
  };
  
  return statusScores[lead.status.toLowerCase()] || 5;
}

// Enhanced engagement scoring
function calculateEngagementScore(lead: Lead): number {
  const statusEngagement: Record<string, number> = {
    'novo': 5,          // Neutral - not engaged yet
    'contato': 7,       // Initial engagement
    'contatado': 7,     // Some engagement
    'qualificado': 8,   // Good engagement
    'agendado': 9,      // High engagement
    'proposta': 9,      // Very high engagement
    'convertido': 10,   // Maximum engagement
    'fechado': 10,      // Maximum engagement
    'perdido': 2,       // Lost engagement
    'cancelado': 1      // No engagement
  };
  
  let baseScore = statusEngagement[lead.status.toLowerCase()] || 5;
  
  // Engagement bonuses
  if (lead.phone && lead.email) baseScore += 1;           // Multiple contact methods
  if (lead.whatsapp_verified) baseScore += 1;            // WhatsApp verified
  if (lead.niche) baseScore += 0.5;                      // Niche specified
  
  // Data quality affects engagement potential
  const dataQuality = calculateDataCompletenessScore(lead) / 10;
  baseScore = baseScore * (0.7 + (dataQuality * 0.3));   // Weight by data quality
  
  return Math.min(Math.round(baseScore * 10) / 10, 10);
}

// Enhanced weighted scoring calculation
function calculateWeightedScore(criteria: ScoringCriteria, weights: ScoringWeights): number {
  const contactScore = (criteria.hasPhone + criteria.hasEmail) / 2;
  const businessScore = criteria.businessQuality;
  const locationScore = criteria.cityScore;
  const nicheScore = criteria.nicheScore;
  const engagementScore = (criteria.responseTime + criteria.engagementLevel) / 2;
  const whatsappScore = criteria.whatsappQuality;
  const dataQualityScore = (criteria.dataCompleteness + criteria.leadAge + criteria.sourceQuality) / 3;
  
  const weightedScore = 
    (contactScore * weights.contactInfo) +
    (businessScore * weights.businessProfile) +
    (locationScore * weights.location) +
    (nicheScore * weights.niche) +
    (engagementScore * weights.engagement) +
    (whatsappScore * weights.whatsapp) +
    (dataQualityScore * weights.dataQuality);
  
  return Math.max(0, Math.min(10, weightedScore));
}