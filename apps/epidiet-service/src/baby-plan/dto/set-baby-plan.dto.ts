import { Equals, IsEnum } from 'class-validator';
import { BabyGenderChoice } from '../../common/enums';

export class SetBabyPlanDto {
  @IsEnum(BabyGenderChoice)
  desiredGender: BabyGenderChoice;

  /** Must be explicitly true — the disclaimer has to be read and accepted client-side first. */
  @Equals(true)
  disclaimerAcknowledged: boolean;
}
