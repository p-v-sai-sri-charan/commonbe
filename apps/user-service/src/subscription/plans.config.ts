/**
 * Subscription plan catalog.
 *
 * Extend `apps` to unlock a plan on additional services (e.g. add 'ecom'
 * when ecom-service is ready). Everything billing-related lives in
 * payment-service; everything entitlement-related lives in user-service.
 */

export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'couple';
export type BillingPeriod = 'monthly' | 'annual';

export interface PlanFeatures {
  /** Monthly AI token quota. -1 means unlimited (set aiTokenLimit to a very high ceiling). */
  aiTokensPerMonth: number;
  /** AI-generated rationale text appended to meal plans. */
  aiMealRationale: boolean;
  /** Access to the baby/conception plan module. */
  babyPlan: boolean;
  /** Historical pathway score trend (multiple snapshots). */
  assessmentTrend: boolean;
  /** Second linked account for Couple plan. */
  partnerAccount: boolean;
  /** App slugs this plan covers — checked by per-app feature gates. */
  apps: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod | null;
  /** Price in Indian paise (₹1 = 100 paise). 0 for free. */
  priceInPaise: number;
  /** Human-readable price string for UI. */
  priceDisplay: string;
  /** Monthly equivalent for annual plans — shown as "₹X/month, billed annually". */
  monthlyEquivalentDisplay?: string;
  /** Full-price paise before discount (annual plans only). */
  originalPriceInPaise?: number;
  savingsPercent?: number;
  savingsDisplay?: string;
  /** How long (days) the subscription validity lasts. */
  validDurationDays: number;
  features: PlanFeatures;
  isPopular?: boolean;
  /** Limited-availability promotional plan. */
  isLaunchOffer?: boolean;
  /** If set, the plan is a trial that converts to `convertsTo` after `trialDurationMonths`. */
  trialDurationMonths?: number;
  convertsTo?: string;
  badge?: string;
}

// ─── Token quotas ──────────────────────────────────────────────────────────────
// Mapped to user-service aiTokenLimit when a subscription is activated.
// The AI coach consumes ~1 000 tokens per exchange on average.
export const AI_TOKENS = {
  FREE: 5_000,     // ~5 exchanges
  PLUS: 50_000,    // ~50 exchanges
  UNLIMITED: 9_999_999,
} as const;

// ─── Plan catalog ──────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // ── Free ────────────────────────────────────────────────────────────────────
  {
    id: 'free',
    name: 'Free',
    tagline: 'Get started with epigenetic nutrition',
    tier: 'free',
    billingPeriod: null,
    priceInPaise: 0,
    priceDisplay: '₹0',
    validDurationDays: 36500,
    features: {
      aiTokensPerMonth: AI_TOKENS.FREE,
      aiMealRationale: false,
      babyPlan: false,
      assessmentTrend: false,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },

  // ── Plus ────────────────────────────────────────────────────────────────────
  {
    id: 'plus_monthly',
    name: 'Plus',
    tagline: 'Full features, flexible billing',
    tier: 'plus',
    billingPeriod: 'monthly',
    priceInPaise: 19_900,
    priceDisplay: '₹199/month',
    validDurationDays: 30,
    isPopular: true,
    features: {
      aiTokensPerMonth: AI_TOKENS.PLUS,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },
  {
    id: 'plus_annual',
    name: 'Plus',
    tagline: 'Full features, best value',
    tier: 'plus',
    billingPeriod: 'annual',
    priceInPaise: 149_900,
    priceDisplay: '₹1,499/year',
    monthlyEquivalentDisplay: '₹125/month',
    originalPriceInPaise: 238_800, // 12 × ₹199
    savingsPercent: 37,
    savingsDisplay: 'Save ₹739',
    validDurationDays: 365,
    features: {
      aiTokensPerMonth: AI_TOKENS.PLUS,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },

  // ── Pro ─────────────────────────────────────────────────────────────────────
  {
    id: 'pro_monthly',
    name: 'Pro',
    tagline: 'Unlimited AI + advanced analytics',
    tier: 'pro',
    billingPeriod: 'monthly',
    priceInPaise: 39_900,
    priceDisplay: '₹399/month',
    validDurationDays: 30,
    features: {
      aiTokensPerMonth: AI_TOKENS.UNLIMITED,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },
  {
    id: 'pro_annual',
    name: 'Pro',
    tagline: 'Unlimited AI, best annual value',
    tier: 'pro',
    billingPeriod: 'annual',
    priceInPaise: 299_900,
    priceDisplay: '₹2,999/year',
    monthlyEquivalentDisplay: '₹250/month',
    originalPriceInPaise: 478_800, // 12 × ₹399
    savingsPercent: 37,
    savingsDisplay: 'Save ₹1,789',
    validDurationDays: 365,
    features: {
      aiTokensPerMonth: AI_TOKENS.UNLIMITED,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },

  // ── Couple ──────────────────────────────────────────────────────────────────
  {
    id: 'couple_monthly',
    name: 'Couple',
    tagline: 'Pro for two — plan together',
    tier: 'couple',
    billingPeriod: 'monthly',
    priceInPaise: 59_900,
    priceDisplay: '₹599/month',
    validDurationDays: 30,
    features: {
      aiTokensPerMonth: AI_TOKENS.UNLIMITED,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: true,
      apps: ['epidiet'],
    },
  },
  {
    id: 'couple_annual',
    name: 'Couple',
    tagline: 'Pro for two — best annual value',
    tier: 'couple',
    billingPeriod: 'annual',
    priceInPaise: 449_900,
    priceDisplay: '₹4,499/year',
    monthlyEquivalentDisplay: '₹375/month',
    originalPriceInPaise: 718_800, // 12 × ₹599
    savingsPercent: 37,
    savingsDisplay: 'Save ₹2,689',
    validDurationDays: 365,
    features: {
      aiTokensPerMonth: AI_TOKENS.UNLIMITED,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: true,
      apps: ['epidiet'],
    },
  },

  // ── Launch offers ────────────────────────────────────────────────────────────
  {
    id: 'launch_annual',
    name: 'Launch Annual',
    tagline: 'Pro features, early-user price — limited time',
    tier: 'pro',
    billingPeriod: 'annual',
    priceInPaise: 99_900,
    priceDisplay: '₹999/year',
    monthlyEquivalentDisplay: '₹83/month',
    originalPriceInPaise: 299_900,
    savingsPercent: 67,
    savingsDisplay: 'Save ₹2,000',
    validDurationDays: 365,
    isLaunchOffer: true,
    badge: '🔥 Early Bird',
    features: {
      aiTokensPerMonth: AI_TOKENS.UNLIMITED,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },
  {
    id: 'launch_trial',
    name: 'Launch Trial',
    tagline: '3 months of Plus for ₹99/month',
    tier: 'plus',
    billingPeriod: 'monthly',
    priceInPaise: 9_900,
    priceDisplay: '₹99/month',
    validDurationDays: 90,
    trialDurationMonths: 3,
    convertsTo: 'plus_monthly',
    isLaunchOffer: true,
    badge: '🎉 Trial',
    features: {
      aiTokensPerMonth: AI_TOKENS.PLUS,
      aiMealRationale: true,
      babyPlan: true,
      assessmentTrend: true,
      partnerAccount: false,
      apps: ['epidiet'],
    },
  },
];

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

/** Returns the AI token quota to set on the user profile for a given plan. */
export function getAiTokenQuotaForPlan(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) return AI_TOKENS.FREE;
  const { aiTokensPerMonth } = plan.features;
  return aiTokensPerMonth === -1 ? AI_TOKENS.UNLIMITED : aiTokensPerMonth;
}
