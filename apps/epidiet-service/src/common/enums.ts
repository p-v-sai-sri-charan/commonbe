/** Drives the Female/Male epigenetic protocol — see assessment + coach modules. */
export enum BiologicalSex {
  FEMALE = 'female',
  MALE = 'male',
}

/** "Are you trying to conceive?" follow-up choice. Only meaningful when trying. */
export enum BabyGenderChoice {
  BOY = 'boy',
  GIRL = 'girl',
  NATURAL = 'natural',
}

export enum EpigeneticPathway {
  METHYLATION = 'methylation',
  HISTONE_MODIFICATION = 'histone_modification',
  OXIDATIVE_STRESS = 'oxidative_stress',
  GUT_MICROBIOME = 'gut_microbiome',
}

export enum FoodEpigeneticTag {
  METHYL_DONOR = 'methyl_donor',
  HDAC_INHIBITOR = 'hdac_inhibitor',
  ANTI_INFLAMMATORY = 'anti_inflammatory',
  SIRTUIN_ACTIVATOR = 'sirtuin_activator',
  BABY_BOY_PROTOCOL = 'baby_boy_protocol',
  BABY_GIRL_PROTOCOL = 'baby_girl_protocol',
  FEMALE_PROTOCOL = 'female_protocol',
  MALE_PROTOCOL = 'male_protocol',
}

export enum StressLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum SleepQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
}

export enum ExerciseHabit {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
}
