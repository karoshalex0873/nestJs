import { IsString, isString } from "class-validator";

export  class DomainDto{
  
  // name
  @IsString()
  name:string

  @IsString()
  description:string 
}