import { BabyGenderChoice } from '../../common/enums';

export interface PartnerPlan {
  recommendedFoods: string[];
  avoidFoods: string[];
  geneReferences: string[];
  summary: string;
}

export interface BabyPlanProtocol {
  mother: PartnerPlan;
  father: PartnerPlan;
}

export const BABY_PLAN_DISCLAIMER =
  'This protocol is based on general epigenetic and nutrition science for educational purposes only. ' +
  'It is not a guarantee of any outcome and does not replace medical advice — speak with a healthcare ' +
  'provider before making significant dietary changes, especially when trying to conceive.';

export const BABY_PLAN_TIMELINE_WEEKS = 12; // ~90 days: full sperm + egg maturation cycle

export const BABY_PLAN_PROTOCOLS: Record<BabyGenderChoice, BabyPlanProtocol> = {
  [BabyGenderChoice.BOY]: {
    mother: {
      recommendedFoods: ['Bananas', 'Lean meat', 'Sodium-rich foods (in moderation)'],
      avoidFoods: ['Excess calcium-rich dairy', 'Highly acidic foods (citrus in excess)'],
      geneReferences: ['DAZL'],
      summary: 'Alkaline-leaning diet pattern thought to favor a more hospitable environment for Y-bearing sperm.',
    },
    father: {
      recommendedFoods: ['Oysters', 'Tomatoes (lycopene)', 'Brazil nuts'],
      avoidFoods: ['Processed meat', 'BPA-lined packaged foods', 'Excess alcohol'],
      geneReferences: ['CYP17A1', 'SOD2'],
      summary:
        "Zinc (oysters) supports CYP17A1-driven testosterone synthesis, lycopene supports sperm DNA integrity, and selenium (Brazil nuts) feeds the SOD2 antioxidant pathway protecting Y-DNA-bearing sperm.",
    },
  },
  [BabyGenderChoice.GIRL]: {
    mother: {
      recommendedFoods: ['Yogurt', 'Berries', 'Leafy greens'],
      avoidFoods: ['Excess sodium', 'High-alkaline mineral supplements'],
      geneReferences: [],
      summary: 'Mildly acidic diet pattern aimed at supporting a cervical pH environment that favors X-bearing sperm.',
    },
    father: {
      recommendedFoods: ['Leafy greens (folate)', 'Fatty fish (EPA)'],
      avoidFoods: ['Processed meat', 'Excess alcohol'],
      geneReferences: ['MTHFR'],
      summary: "Folate and EPA support healthy sperm methylation patterns as part of the father's protocol.",
    },
  },
  [BabyGenderChoice.NATURAL]: {
    mother: {
      recommendedFoods: ['A balanced epigenetic-friendly diet — see your main meal plan'],
      avoidFoods: [],
      geneReferences: [],
      summary: 'No gender-targeting protocol — follow your regular EpiDiet meal plan for general preconception health.',
    },
    father: {
      recommendedFoods: ['A balanced epigenetic-friendly diet — see your main meal plan'],
      avoidFoods: [],
      geneReferences: [],
      summary: 'No gender-targeting protocol — general preconception nutrition supports healthy sperm epigenetics either way.',
    },
  },
};
