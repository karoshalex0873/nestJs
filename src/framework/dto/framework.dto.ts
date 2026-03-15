import { IsNotEmpty, IsString } from "class-validator";

export class FrameworkDto {

  @IsString()
  @IsNotEmpty()
  frameworkName: string;
  
  @IsString()
  description: string;
}