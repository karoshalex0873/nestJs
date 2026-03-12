import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsString, IsUUID } from 'class-validator';

export class RoleDto {
  @IsString()
  @IsUUID()
  roleId: string;

  @Transform(({ value, obj }) => {
    const source = value ?? obj.userIds;

    if (Array.isArray(source)) return source;
    if (typeof source === 'string') return [source];

    return [];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  userId: string[];
}