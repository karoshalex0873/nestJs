import { IsString } from "class-validator"

export class DisplineDto {
  
  @IsString()
  displineName:string
  @IsString()
  displineDescription:String
}