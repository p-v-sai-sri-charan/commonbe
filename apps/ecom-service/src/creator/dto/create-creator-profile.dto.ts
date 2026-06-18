import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCreatorProfileDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may only contain lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;
}
