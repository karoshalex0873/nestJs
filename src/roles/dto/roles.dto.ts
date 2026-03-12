import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class RoleDto {
  @IsString()
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
  userId: string[];
}