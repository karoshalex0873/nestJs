import { IsBoolean, IsOptional, IsUUID } from 'class-validator'

export class UpdateProjectProgressDto {
    @IsUUID()
    stepId!: string

    @IsOptional()
    @IsBoolean()
    completed?: boolean
}
