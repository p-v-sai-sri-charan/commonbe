import { IsInt, Min } from 'class-validator';

export class ConsumeAiTokensDto {
  @IsInt()
  @Min(0)
  amount: number;
}
