


// the DTO (Data Transfer Object) is used to define the shape of the data that will be sent over the network. It is a simple class that contains properties that correspond to the data that will be sent. In this case, we can define a UserDto class that contains properties such as id, name, email, etc.

import { IsEmail, IsString, IsStrongPassword } from "class-validator";


export class UserDto {
  // 1. email field
  @IsEmail()
  email: string;

  // 2. name field
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

}

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;
}