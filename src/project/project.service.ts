import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProjectProgressDto } from './dto';

@Injectable()
export class ProjectService {
    constructor(
        // 1. ai service 
        private aiService: AiService,
        //  2. prisma service
        private prismaService: PrismaService
    ) { }

    // 1. create a new Main for the user based on their framework. and use AI to generate project details based on the user's current concept and framework.
    async createMainProject(userId: string) {
        // 1. fetch the user's active framework
        const userFramework = await this.prismaService.userFramework.findFirst({
            where: { userId, active: true },
            include: {
                framework: {
                    include: {
                        discipline: {
                            include: { domain: true }
                        },
                        concepts: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        })

        if (!userFramework) {
            throw new NotFoundException('User framework not found')
        }

        const existingProject = await this.prismaService.mainProject.findFirst({
            where: { frameworkId: userFramework.frameworkId },
            include: {
                steps: { orderBy: { order: 'asc' } }
            }
        })

        if (existingProject) {
            return existingProject
        }

        const completedConcepts = await this.prismaService.userConceptProgress.findMany({
            where: {
                userId,
                completed: true,
                concept: {
                    frameworkId: userFramework.frameworkId
                }
            },
            include: {
                concept: true
            },
            orderBy: {
                concept: { order: 'asc' }
            }
        })

        if (!completedConcepts.length) {
            throw new NotFoundException('No completed concepts found for this framework')
        }

        const conceptSummary = completedConcepts
            .map(progress => `${progress.concept.order}. ${progress.concept.name}`)
            .join('\n')

        const levelHint = completedConcepts.length <= 2
            ? 'BEGINNER'
            : completedConcepts.length <= 5
                ? 'INTERMEDIATE'
                : 'ADVANCED'

        // 2. use AI service to generate project details based on the user's framework and concepts
        const prompt = `
Create one real-world main project for a learner.

Context:
- Domain: ${userFramework.framework.discipline.domain.name}
- Discipline: ${userFramework.framework.discipline.name}
- Framework: ${userFramework.framework.name}
- Concepts (order and name):
${conceptSummary}
- Learner level hint: ${levelHint}

Rules:
- The project must be practical and production-like.
- Use features and constraints a real team would face.
- Provide step-by-step milestones aligned to completed concept order only.
- Each step should map to exactly one completed concept order.
- Choose a difficulty that matches the learner level hint.
- Estimate duration based on scope and complexity.
- Keep language clear and concise.

Output format:
- Return JSON only.
- No markdown.
- No extra text.

Use exactly this JSON shape:
{
  "title": "<project title>",
  "description": "<short overview>",
    "problemStatement": "<real-world problem to solve>",
    "requirements": [
        "<clear requirement>",
        "<clear requirement>"
    ],
    "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>",
    "estimatedMinutes": <realistic time>,
  "steps": [
    {
      "order": 1,
      "conceptOrder": 1,
      "title": "<step title>",
      "description": "<step description>"
    }
  ]
}
`.trim()

        const rawJson = await this.aiService.generateText(prompt)
        if (!rawJson) {
            throw new ConflictException('Failed to generate a main project')
        }

        let parsed: {
            title: string
            description: string
            problemStatement?: string
            requirements?: string[]
            difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
            estimatedMinutes?: number
            steps: Array<{ order: number; conceptOrder: number; title: string; description: string }>
        }

        try {
            parsed = JSON.parse(rawJson)
        } catch (error) {
            throw new ConflictException('AI response was not valid JSON')
        }

        if (!parsed?.title || !parsed?.description || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
            throw new ConflictException('AI response missing required project fields')
        }

        if (parsed.difficulty && !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(parsed.difficulty)) {
            throw new ConflictException('AI response has invalid difficulty')
        }

        const conceptOrderMap = new Map(
            completedConcepts.map(progress => [progress.concept.order, progress.concept.id])
        )

        const stepCreates = parsed.steps.map(step => {
            const conceptId = conceptOrderMap.get(step.conceptOrder)
            if (!conceptId) {
                throw new ConflictException(`Invalid conceptOrder in AI response: ${step.conceptOrder}`)
            }

            return {
                order: step.order,
                title: step.title,
                description: step.description,
                conceptId
            }
        })

        return this.prismaService.mainProject.create({
            data: {
                name: parsed.title,
                description: parsed.description,
                problemStatement: parsed.problemStatement,
                requirements: parsed.requirements ?? undefined,
                difficulty: parsed.difficulty ?? levelHint,
                estimatedMinutes: parsed.estimatedMinutes,
                frameworkId: userFramework.frameworkId,
                steps: {
                    create: stepCreates
                }
            },
            include: {
                steps: { orderBy: { order: 'asc' } }
            }
        })
    }

    async getProjectDetails(userId: string) {
        // fetch the user's active main project with steps and return it. if no project exists, return null.
        const project = await this.prismaService.mainProject.findFirst({
            where: {
                framework: {
                    userFrameworks:
                    {
                        some: { userId, active: true }
                    }
                }
            },
            // include steps and their completion status for the user
            include:{
                steps:{
                    orderBy: { order: 'asc' },
                    include: {
                        userProgress: {
                            where: { userId },
                            select: { completed: true, completedAt: true }
                        }
                    }
                }
            }
        })

        return project || null
    }

    async updateProjectProgress(userId: string, dto: UpdateProjectProgressDto) {
        // this method will handle updates to the project progress, such as marking steps as completed, adding notes, etc.

        const step = await this.prismaService.projectStep.findUnique({
            where: {
                id: dto.stepId
            },
            include: {
                mainProject: {
                    select: {
                        frameworkId: true
                    }
                }
            }
        })

        if (!step) {
            throw new NotFoundException('Project step not found')
        }

        const userFramework = await this.prismaService.userFramework.findFirst({
            where: {
                userId,
                frameworkId: step.mainProject.frameworkId
            }
        })

        if (!userFramework) {
            throw new NotFoundException('User framework not found for this step')
        }

        const completed = dto.completed ?? true
        const completedAt = completed ? new Date() : null

        const progress = await this.prismaService.userProjectStep.upsert({
            where: {
                userId_stepId: {
                    userId,
                    stepId: dto.stepId
                }
            },
            create: {
                userId,
                stepId: dto.stepId,
                completed,
                completedAt
            },
            update: {
                completed,
                completedAt
            }
        })

        return {
            message: completed ? 'Project step marked as completed' : 'Project step marked as incomplete',
            stepId: dto.stepId,
            completed: progress.completed,
            completedAt: progress.completedAt
        }
    }

    async getProjectProgress(userId: string) {
        // fetch the user's active main project with steps and return the completion status of each step.

        const project = await this.prismaService.mainProject.findFirst({
            where: { framework: {
                userFrameworks:{ some: { userId, active: true } }
            }}
        })

        if (!project) {
            throw new NotFoundException('Active project not found for user')
        }

        // Fetch the completion status of each step for the user
        const steps = await this.prismaService.projectStep.findMany({
            where: { mainProjectId: project.id },
            orderBy: { order: 'asc' },
            include: {
                userProgress: {
                    where: { userId },
                    select: { completed: true, completedAt: true }
                }
            }
        })
        
        return steps
    }
}


