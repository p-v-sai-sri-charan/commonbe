import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  value: string[];
}
