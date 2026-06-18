import { IsIn, IsString } from 'class-validator';

export class SetByokDto {
  @IsIn(['openai', 'anthropic'])
  provider: 'openai' | 'anthropic';

  @IsString()
  apiKey: string;
}
