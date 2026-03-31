import { IsString, MinLength } from 'class-validator';

export class GenerateRoadmapDto {
  @IsString()
  @MinLength(2)
  domain!: string;

  @IsString()
  @MinLength(2)
  discipline!: string;

  @IsString()
  @MinLength(2)
  framework!: string;
}

