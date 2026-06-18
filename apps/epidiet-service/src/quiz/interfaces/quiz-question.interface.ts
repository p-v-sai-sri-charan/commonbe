import { EpigeneticPathway } from '../../common/enums';

export type QuizQuestionType = 'single' | 'multi' | 'scale';

export interface QuizOption {
  value: string;
  label: string;
  /** Contribution toward the option's pathway score (0-3), where relevant. */
  score?: number;
}

export interface QuizDependsOn {
  questionId: string;
  /** The dependent question only applies when the answer equals one of these values. */
  equals: string[];
}

export interface QuizQuestion {
  id: string;
  section: 'biological_sex' | 'epigenetic_pathways' | 'lifestyle' | 'baby_planning';
  text: string;
  type: QuizQuestionType;
  options?: QuizOption[];
  /** Which epigenetic pathway this question's score feeds into, if any. */
  pathway?: EpigeneticPathway;
  dependsOn?: QuizDependsOn;
}
