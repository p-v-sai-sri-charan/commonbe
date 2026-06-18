import { FoodEpigeneticTag } from '../../common/enums';

export interface FoodItemSeed {
  name: string;
  category: string;
  epigeneticTags: FoodEpigeneticTag[];
  geneImpactExplanation: string;
  genesOrPathways: string[];
}

const { METHYL_DONOR, HDAC_INHIBITOR, ANTI_INFLAMMATORY, SIRTUIN_ACTIVATOR, BABY_BOY_PROTOCOL, BABY_GIRL_PROTOCOL, FEMALE_PROTOCOL, MALE_PROTOCOL } =
  FoodEpigeneticTag;

export const FOOD_ITEMS_SEED: FoodItemSeed[] = [
  {
    name: 'Leafy greens (spinach, kale)',
    category: 'vegetable',
    epigeneticTags: [METHYL_DONOR, BABY_GIRL_PROTOCOL],
    geneImpactExplanation: 'Rich in folate, a key methyl donor for healthy DNA methylation patterns.',
    genesOrPathways: ['MTHFR'],
  },
  {
    name: 'Beets',
    category: 'vegetable',
    epigeneticTags: [METHYL_DONOR],
    geneImpactExplanation: 'Contains betaine, which supports the methylation cycle alongside folate.',
    genesOrPathways: ['MTHFR'],
  },
  {
    name: 'Eggs',
    category: 'protein',
    epigeneticTags: [METHYL_DONOR],
    geneImpactExplanation: 'High in choline, a precursor for methyl-group donation in one-carbon metabolism.',
    genesOrPathways: ['MTHFR'],
  },
  {
    name: 'Broccoli',
    category: 'vegetable',
    epigeneticTags: [HDAC_INHIBITOR, FEMALE_PROTOCOL, MALE_PROTOCOL],
    geneImpactExplanation:
      'Sulforaphane is an HDAC inhibitor that can reactivate the silenced tumor-suppressor gene GSTP1, and supplies DIM/I3C that shift estrogen toward protective 2-OHE metabolites.',
    genesOrPathways: ['GSTP1', 'DIM', 'I3C'],
  },
  {
    name: 'Fermented foods (yogurt, kimchi, sauerkraut)',
    category: 'fermented',
    epigeneticTags: [HDAC_INHIBITOR, BABY_GIRL_PROTOCOL],
    geneImpactExplanation: 'Gut fermentation produces butyrate, an HDAC inhibitor that supports gene expression and gut barrier integrity.',
    genesOrPathways: ['Estrobolome'],
  },
  {
    name: 'Fatty fish (salmon, sardines)',
    category: 'protein',
    epigeneticTags: [ANTI_INFLAMMATORY, MALE_PROTOCOL],
    geneImpactExplanation: 'EPA/DHA omega-3s lower systemic inflammation and reduce 5-α reductase conversion of testosterone to DHT.',
    genesOrPathways: ['5-alpha-reductase'],
  },
  {
    name: 'Turmeric',
    category: 'spice',
    epigeneticTags: [ANTI_INFLAMMATORY],
    geneImpactExplanation: 'Curcumin modulates inflammatory gene expression pathways (NF-κB).',
    genesOrPathways: ['NF-kB'],
  },
  {
    name: 'Berries (blueberries, strawberries)',
    category: 'fruit',
    epigeneticTags: [ANTI_INFLAMMATORY, SIRTUIN_ACTIVATOR, BABY_GIRL_PROTOCOL],
    geneImpactExplanation: 'Polyphenols provide antioxidant capacity and activate sirtuin longevity pathways.',
    genesOrPathways: ['SIRT1'],
  },
  {
    name: 'Red grapes',
    category: 'fruit',
    epigeneticTags: [SIRTUIN_ACTIVATOR],
    geneImpactExplanation: 'Source of resveratrol, a well-studied sirtuin (SIRT1) activator linked to longevity pathways.',
    genesOrPathways: ['SIRT1'],
  },
  {
    name: 'Onions & apples',
    category: 'produce',
    epigeneticTags: [SIRTUIN_ACTIVATOR],
    geneImpactExplanation: 'Rich in quercetin, which supports sirtuin activation and antioxidant defenses.',
    genesOrPathways: ['SIRT1'],
  },
  {
    name: 'Green tea',
    category: 'beverage',
    epigeneticTags: [SIRTUIN_ACTIVATOR, ANTI_INFLAMMATORY],
    geneImpactExplanation: 'EGCG catechins activate sirtuin pathways and provide strong antioxidant capacity.',
    genesOrPathways: ['SIRT1'],
  },
  {
    name: 'Flaxseed',
    category: 'seed',
    epigeneticTags: [FEMALE_PROTOCOL],
    geneImpactExplanation: 'Lignans modulate estrogen receptor gene methylation, favoring protective estrogen metabolism.',
    genesOrPathways: ['ESR1', 'COMT'],
  },
  {
    name: 'Tomatoes',
    category: 'vegetable',
    epigeneticTags: [MALE_PROTOCOL, BABY_BOY_PROTOCOL],
    geneImpactExplanation: 'Lycopene helps demethylate GSTP1 and RASSF1A, key prostate tumor-suppressor genes.',
    genesOrPathways: ['GSTP1', 'RASSF1A'],
  },
  {
    name: 'Oysters & pumpkin seeds',
    category: 'protein',
    epigeneticTags: [MALE_PROTOCOL, BABY_BOY_PROTOCOL],
    geneImpactExplanation: 'High in zinc, a required cofactor for CYP17A1-mediated testosterone synthesis.',
    genesOrPathways: ['CYP17A1'],
  },
  {
    name: 'Bananas',
    category: 'fruit',
    epigeneticTags: [BABY_BOY_PROTOCOL],
    geneImpactExplanation: 'Part of the alkaline-leaning, potassium-rich diet pattern in the Baby Boy protocol.',
    genesOrPathways: ['DAZL'],
  },
  {
    name: 'Lean meat',
    category: 'protein',
    epigeneticTags: [BABY_BOY_PROTOCOL],
    geneImpactExplanation: 'Provides sodium and protein consistent with the alkaline-diet Baby Boy protocol.',
    genesOrPathways: ['DAZL'],
  },
  {
    name: 'Brazil nuts',
    category: 'nut',
    epigeneticTags: [BABY_BOY_PROTOCOL],
    geneImpactExplanation: 'Excellent selenium source, a cofactor for the antioxidant enzyme SOD2 relevant to sperm health.',
    genesOrPathways: ['SOD2'],
  },
];
