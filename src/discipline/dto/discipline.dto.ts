import { IsOptional, IsString, IsUUID } from "class-validator";

export class DisciplineDto {
  @IsUUID()
  domainId: string;

  @IsString()
  disciplineName: string;

  @IsString()
  description: string;
}

export class UpdateDisciplineDto {
  @IsOptional()
  @IsUUID()
  domainId?: string;

  @IsOptional()
  @IsString()
  disciplineName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SelectDisciplineDto {

  @IsUUID()
  disciplineId: string;
}