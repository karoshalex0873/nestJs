import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FrameworkDto {

  @IsString()
  @IsNotEmpty()
  frameworkName: string;
  
  @IsString()
  description: string;
}

export class UpdateFrameworkDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  frameworkName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}