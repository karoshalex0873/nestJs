import { Type } from 'class-transformer'
import {
	ArrayNotEmpty,
	IsArray,
	IsBoolean,
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min,
	MinLength,
	IsUUID,
	ValidateNested
} from 'class-validator'

export class ConceptPracticeQuestionDto {
	@IsString()
	@IsNotEmpty()
	title!: string

	@IsString()
	@IsNotEmpty()
	question!: string

	@IsString()
	@IsNotEmpty()
	answer!: string

	@IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
	difficulty!: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

export class ConceptSubtopicExampleDto {
	@IsString()
	@IsNotEmpty()
	title!: string

	@IsString()
	@IsNotEmpty()
	code!: string

	@IsString()
	@IsNotEmpty()
	explanation!: string
}

export class ConceptSubtopicDto {
	@IsString()
	@IsNotEmpty()
	name!: string

	@IsString()
	@IsNotEmpty()
	description!: string

	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => ConceptSubtopicExampleDto)
	examples!: ConceptSubtopicExampleDto[]

	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => ConceptPracticeQuestionDto)
	practiceQuestions!: ConceptPracticeQuestionDto[]
}

export class ConceptProjectDto {
	@IsString()
	@IsNotEmpty()
	title!: string

	@IsString()
	@IsNotEmpty()
	description!: string

	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	requirements!: string[]

	@IsString()
	@IsNotEmpty()
	expectedOutcome!: string
}

export class ConceptAiDto {
	@IsString()
	@IsNotEmpty()
	name!: string

	@IsString()
	@IsNotEmpty()
	description!: string

	@IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
	difficulty!: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

	@IsOptional()
	@IsInt()
	@Min(1)
	estimatedMinutes?: number | null

	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	learningObjectives!: string[]

	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	evaluationCriteria!: string[]

	@ValidateNested()
	@Type(() => ConceptProjectDto)
	project!: ConceptProjectDto

	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => ConceptSubtopicDto)
	subtopics!: ConceptSubtopicDto[]
}

export class CompleteConceptDto {
	@IsOptional()
	@IsUUID()
	conceptId?: string

	@IsOptional()
	@IsInt()
	@Min(0)
	score?: number

	@IsOptional()
	@IsInt()
	@Min(0)
	projectScore?: number

	@IsOptional()
	@IsBoolean()
	projectCompleted?: boolean

	@IsOptional()
	@IsString()
	@MinLength(3)
	feedback?: string
}