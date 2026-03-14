import { IsString, IsUUID } from "class-validator";

export  class DomainDto{
  
  // name
  @IsString()
  name:string

  @IsString()
  description:string 
}

export class SelectDomainDto {
  @IsUUID()
  domainId: string;
}