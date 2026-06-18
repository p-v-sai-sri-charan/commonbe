import { BiologicalSex } from '../../common/enums';

export interface EducationArticleSeed {
  slug: string;
  title: string;
  body: string;
  tags: string[];
  genderRelevance?: BiologicalSex;
}

export const EDUCATION_ARTICLES_SEED: EducationArticleSeed[] = [
  {
    slug: 'what-is-dna-methylation',
    title: 'What is DNA methylation?',
    body:
      'DNA methylation adds small "tags" (methyl groups) to your DNA that switch genes on or off without changing the underlying sequence. Folate-rich foods like leafy greens, beets, and eggs supply the methyl donors this process depends on.',
    tags: ['methylation', 'basics'],
  },
  {
    slug: 'why-broccoli-activates-tumor-suppressor-genes',
    title: 'Why broccoli activates tumor-suppressor genes',
    body:
      'Broccoli (and other cruciferous vegetables) contain sulforaphane, a natural HDAC inhibitor. It can help reactivate genes like GSTP1 that protect against cell damage but get silenced over time.',
    tags: ['hdac_inhibitor', 'food_spotlight'],
  },
  {
    slug: 'understanding-oxidative-stress',
    title: 'Understanding oxidative stress',
    body:
      'Oxidative stress happens when free radicals outpace your body\'s antioxidant defenses, which can accelerate unfavorable epigenetic changes. Berries, green tea, and turmeric all help rebuild that antioxidant capacity.',
    tags: ['oxidative_stress', 'basics'],
  },
  {
    slug: 'your-gut-microbiome-and-genes',
    title: 'Your gut microbiome and your genes',
    body:
      'Gut bacteria ferment fiber into short-chain fatty acids like butyrate, which itself acts as an HDAC inhibitor inside your gut lining cells. A diverse, fiber-rich diet supports both your microbiome and your epigenome.',
    tags: ['gut_microbiome', 'basics'],
  },
  {
    slug: 'estrogen-methylation-comt-cyp1b1',
    title: 'COMT, CYP1B1, and estrogen methylation',
    body:
      'COMT and CYP1B1 are key genes in clearing estrogen metabolites safely. Cruciferous vegetables (DIM, I3C) and flaxseed lignans help shift estrogen metabolism toward the protective 2-OHE pathway.',
    tags: ['estrogen', 'female_protocol'],
    genderRelevance: BiologicalSex.FEMALE,
  },
  {
    slug: 'lycopene-and-prostate-gene-expression',
    title: 'Lycopene and prostate gene expression',
    body:
      'Lycopene, abundant in tomatoes, has been studied for its role in demethylating GSTP1 and RASSF1A — two genes that act as tumor suppressors in prostate tissue.',
    tags: ['lycopene', 'male_protocol'],
    genderRelevance: BiologicalSex.MALE,
  },
];
