import { EpigeneticPathway } from '../../common/enums';
import { QuizQuestion } from '../interfaces/quiz-question.interface';

/**
 * Static question catalog. Small/fixed enough to not warrant a DB-backed
 * CMS yet — promote to Mongo-backed if/when this needs to be editable
 * without a deploy.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- Step 1: Biological Sex ---
  {
    id: 'biological_sex',
    section: 'biological_sex',
    type: 'single',
    text: 'Biological sex',
    options: [
      { value: 'female', label: 'Female — Estrogen & hormonal methylation' },
      { value: 'male', label: 'Male — Androgen & testosterone methylation' },
    ],
  },

  // --- Epigenetic pathway assessment ---
  // Methylation (MTHFR / folate metabolism)
  {
    id: 'methylation_folate_intake',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.METHYLATION,
    type: 'single',
    text: 'How often do you eat leafy greens, beets, or eggs (methyl donors)?',
    options: [
      { value: 'rarely', label: 'Rarely', score: 0 },
      { value: 'sometimes', label: 'A few times a week', score: 1 },
      { value: 'often', label: 'Most days', score: 2 },
      { value: 'daily', label: 'Every day', score: 3 },
    ],
  },
  {
    id: 'methylation_family_history',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.METHYLATION,
    type: 'single',
    text: 'Any known MTHFR mutation or family history of folate-related conditions?',
    options: [
      { value: 'none', label: 'None known', score: 2 },
      { value: 'unsure', label: 'Not sure', score: 1 },
      { value: 'yes', label: 'Yes', score: 0 },
    ],
  },

  // Histone modification (inflammation / stress)
  {
    id: 'histone_inflammation_symptoms',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.HISTONE_MODIFICATION,
    type: 'single',
    text: 'How often do you notice inflammation symptoms (joint pain, bloating, skin flare-ups)?',
    options: [
      { value: 'often', label: 'Often', score: 0 },
      { value: 'sometimes', label: 'Sometimes', score: 1 },
      { value: 'rarely', label: 'Rarely', score: 2 },
      { value: 'never', label: 'Never', score: 3 },
    ],
  },
  {
    id: 'histone_stress_level',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.HISTONE_MODIFICATION,
    type: 'single',
    text: 'How would you rate your day-to-day stress level?',
    options: [
      { value: 'high', label: 'High', score: 0 },
      { value: 'medium', label: 'Medium', score: 1 },
      { value: 'low', label: 'Low', score: 3 },
    ],
  },

  // Oxidative stress (antioxidant capacity)
  {
    id: 'oxidative_antioxidant_intake',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.OXIDATIVE_STRESS,
    type: 'single',
    text: 'How often do you eat berries, green tea, turmeric, or other antioxidant-rich foods?',
    options: [
      { value: 'rarely', label: 'Rarely', score: 0 },
      { value: 'sometimes', label: 'A few times a week', score: 1 },
      { value: 'often', label: 'Most days', score: 2 },
      { value: 'daily', label: 'Every day', score: 3 },
    ],
  },
  {
    id: 'oxidative_smoking_alcohol',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.OXIDATIVE_STRESS,
    type: 'single',
    text: 'Do you smoke or drink alcohol regularly?',
    options: [
      { value: 'both', label: 'Both', score: 0 },
      { value: 'one', label: 'One of them', score: 1 },
      { value: 'neither', label: 'Neither', score: 3 },
    ],
  },

  // Gut microbiome health (fiber intake / diversity)
  {
    id: 'gut_fiber_intake',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.GUT_MICROBIOME,
    type: 'single',
    text: 'How many servings of fiber-rich food (vegetables, legumes, whole grains) do you eat daily?',
    options: [
      { value: '0-1', label: '0-1 servings', score: 0 },
      { value: '2-3', label: '2-3 servings', score: 1 },
      { value: '4-5', label: '4-5 servings', score: 2 },
      { value: '6+', label: '6+ servings', score: 3 },
    ],
  },
  {
    id: 'gut_fermented_foods',
    section: 'epigenetic_pathways',
    pathway: EpigeneticPathway.GUT_MICROBIOME,
    type: 'single',
    text: 'How often do you eat fermented foods (yogurt, kimchi, sauerkraut, kefir)?',
    options: [
      { value: 'rarely', label: 'Rarely', score: 0 },
      { value: 'weekly', label: 'A few times a week', score: 2 },
      { value: 'daily', label: 'Daily', score: 3 },
    ],
  },

  // --- Lifestyle (also feeds the profile, kept here for one consistent quiz flow) ---
  {
    id: 'lifestyle_sleep_quality',
    section: 'lifestyle',
    type: 'single',
    text: 'How would you rate your sleep quality?',
    options: [
      { value: 'poor', label: 'Poor' },
      { value: 'fair', label: 'Fair' },
      { value: 'good', label: 'Good' },
    ],
  },
  {
    id: 'lifestyle_exercise_habits',
    section: 'lifestyle',
    type: 'single',
    text: 'How would you describe your exercise habits?',
    options: [
      { value: 'sedentary', label: 'Sedentary' },
      { value: 'light', label: 'Light activity' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'active', label: 'Very active' },
    ],
  },

  // --- Baby Gender Planning ---
  {
    id: 'baby_trying_to_conceive',
    section: 'baby_planning',
    type: 'single',
    text: 'Are you trying to conceive?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'baby_desired_gender',
    section: 'baby_planning',
    type: 'single',
    text: 'Do you have a gender preference?',
    options: [
      { value: 'boy', label: 'Boy 💙' },
      { value: 'girl', label: 'Girl 💗' },
      { value: 'natural', label: 'Natural 🌈' },
    ],
    dependsOn: { questionId: 'baby_trying_to_conceive', equals: ['yes'] },
  },
];
