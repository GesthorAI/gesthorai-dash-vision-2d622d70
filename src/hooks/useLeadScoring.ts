import { useMemo } from 'react';
import { Lead } from './useLeads';

export interface ScoringCriteria {
  hasPhone: number;
  hasEmail: number;
  businessQuality: number;
  cityScore: number;
  nicheScore: number;
  responseTime: number;
  engagementLevel: number;
}

export interface ScoringWeights {
  contactInfo: number;
  businessProfile: number;
  location: number;
  niche: number;
  engagement: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  contactInfo: 0.25,     // 25% - Informações de contato
  businessProfile: 0.30, // 30% - Qualidade do perfil do negócio
  location: 0.15,        // 15% - Localização/cidade
  niche: 0.20,          // 20% - Nicho/segmento
  engagement: 0.10       // 10% - Nível de engajamento
};

// High-value cities (major markets)
const HIGH_VALUE_CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 
  'Salvador', 'Brasília', 'Curitiba', 'Fortaleza', 'Recife', 'Campinas'
];

// High-value niches (typically higher ticket or conversion)
const HIGH_VALUE_NICHES = [
  'Advocacia', 'Contabilidade', 'Clínicas', 'Imobiliárias', 
  'Consultorias', 'Seguros', 'Financeiro'
];

export const useLeadScoring = (leads: Lead[], customWeights?: Partial<ScoringWeights>) => {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const scoredLeads = useMemo(() => {
    return leads.map(lead => {
      const criteria = calculateScoringCriteria(lead);
      const score = calculateWeightedScore(criteria, weights);
      
      return {
        ...lead,
        score: Math.round(score * 10) / 10, // Round to 1 decimal
        scoringBreakdown: {
          criteria,
          weights,
          totalScore: score
        }
      };
    });
  }, [leads, weights]);

  const scoringStats = useMemo(() => {
    if (scoredLeads.length === 0) return null;

    const scores = scoredLeads.map(lead => lead.score);
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

    // Top performing criteria
    const criteriaAverages = scoredLeads.reduce((acc, lead) => {
      const criteria = lead.scoringBreakdown?.criteria;
      if (criteria) {
        acc.hasPhone += criteria.hasPhone;
        acc.hasEmail += criteria.hasEmail;
        acc.businessQuality += criteria.businessQuality;
        acc.cityScore += criteria.cityScore;
        acc.nicheScore += criteria.nicheScore;
        acc.responseTime += criteria.responseTime;
        acc.engagementLevel += criteria.engagementLevel;
      }
      return acc;
    }, {
      hasPhone: 0,
      hasEmail: 0,
      businessQuality: 0,
      cityScore: 0,
      nicheScore: 0,
      responseTime: 0,
      engagementLevel: 0
    });

    Object.keys(criteriaAverages).forEach(key => {
      criteriaAverages[key as keyof typeof criteriaAverages] /= scoredLeads.length;
    });

    return {
      avgScore,
      maxScore,
      minScore,
      distribution,
      criteriaAverages,
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
  // Contact Information Score
  const hasPhone = lead.phone && lead.phone.trim() ? 10 : 0;
  const hasEmail = lead.email && lead.email.trim() ? 10 : 0;

  // Business Quality Score (based on business name quality)
  const businessQuality = calculateBusinessQuality(lead.business);

  // City Score (higher for major markets)
  const cityScore = HIGH_VALUE_CITIES.includes(lead.city) ? 10 : 7;

  // Niche Score (higher for valuable niches)
  const nicheScore = lead.niche && HIGH_VALUE_NICHES.includes(lead.niche) ? 10 : 8;

  // Response Time Score (based on when lead was created vs current status)
  const responseTime = calculateResponseTimeScore(lead);

  // Engagement Level (based on status progression)
  const engagementLevel = calculateEngagementScore(lead);

  return {
    hasPhone,
    hasEmail,
    businessQuality,
    cityScore,
    nicheScore,
    responseTime,
    engagementLevel
  };
}

function calculateBusinessQuality(businessName: string): number {
  if (!businessName || businessName.trim().length < 3) return 2;
  
  let score = 5; // Base score
  
  // Longer names often indicate more established businesses
  if (businessName.length > 20) score += 2;
  else if (businessName.length > 10) score += 1;
  
  // Check for quality indicators
  const qualityIndicators = ['ltda', 'ltd', 'me', 'eireli', 'sa', 's.a.', 'clinic', 'center', 'instituto'];
  const hasQualityIndicator = qualityIndicators.some(indicator => 
    businessName.toLowerCase().includes(indicator)
  );
  if (hasQualityIndicator) score += 2;
  
  // Avoid obvious fake/test names
  const suspiciousPatterns = ['test', 'teste', 'exemplo', 'sample', 'demo'];
  const isSuspicious = suspiciousPatterns.some(pattern => 
    businessName.toLowerCase().includes(pattern)
  );
  if (isSuspicious) score = Math.max(score - 3, 1);
  
  return Math.min(score, 10);
}

function calculateResponseTimeScore(lead: Lead): number {
  // If lead hasn't been contacted yet, score based on how "fresh" it is
  if (lead.status === 'novo') {
    const createdAt = new Date(lead.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreated < 1) return 10;      // Very fresh
    if (hoursSinceCreated < 4) return 8;       // Fresh
    if (hoursSinceCreated < 24) return 6;      // Same day
    if (hoursSinceCreated < 72) return 4;      // Within 3 days
    return 2; // Older leads
  }
  
  // For contacted leads, score based on status progression
  const statusScores: Record<string, number> = {
    'contatado': 7,
    'qualificado': 8,
    'agendado': 9,
    'convertido': 10,
    'perdido': 3
  };
  
  return statusScores[lead.status.toLowerCase()] || 5;
}

function calculateEngagementScore(lead: Lead): number {
  const statusEngagement: Record<string, number> = {
    'novo': 5,          // Neutral - not engaged yet
    'contatado': 7,     // Some engagement
    'qualificado': 8,   // Good engagement
    'agendado': 9,      // High engagement
    'convertido': 10,   // Maximum engagement
    'perdido': 2        // No engagement
  };
  
  let baseScore = statusEngagement[lead.status.toLowerCase()] || 5;
  
  // Bonus for having both contact methods
  if (lead.phone && lead.email) {
    baseScore = Math.min(baseScore + 1, 10);
  }
  
  return baseScore;
}

function calculateWeightedScore(criteria: ScoringCriteria, weights: ScoringWeights): number {
  const contactScore = (criteria.hasPhone + criteria.hasEmail) / 2;
  const businessScore = criteria.businessQuality;
  const locationScore = criteria.cityScore;
  const nicheScore = criteria.nicheScore;
  const engagementScore = (criteria.responseTime + criteria.engagementLevel) / 2;
  
  const weightedScore = 
    (contactScore * weights.contactInfo) +
    (businessScore * weights.businessProfile) +
    (locationScore * weights.location) +
    (nicheScore * weights.niche) +
    (engagementScore * weights.engagement);
  
  return Math.max(0, Math.min(10, weightedScore));
}