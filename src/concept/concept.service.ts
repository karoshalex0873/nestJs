import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteConceptDto, ConceptAiDto } from './dto';

type GeneratedPracticeQuestion = {
  title: string
  question: string
  answer: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

type GeneratedSubtopic = {
  name: string
  description: string
  examples: Array<{
    title: string
    code: string
    explanation: string
  }>
  practiceQuestions: GeneratedPracticeQuestion[]
}

type GeneratedConcept = {
  name: string
  description: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  estimatedMinutes: number | null
  learningObjectives: string[]
  evaluationCriteria: string[]
  project: {
    title: string
    description: string
    requirements: string[]
    expectedOutcome: string
  }
  subtopics: GeneratedSubtopic[]
}

@Injectable()
export class ConceptService {

  constructor(
    // 1. ai service 
    private aiService: AiService,
    //  2. prisma service
    private prismaService: PrismaService
  ) { }

  // Generates or reuses today's concept for the user and persists the session.
  async createConcept(userId: string) {
    const todayRange = this.getDayRange(new Date())

    const existingSession = await this.findTodaysSession(userId, todayRange)
    if (existingSession?.concept && this.isConceptUsable(existingSession.concept)) {
      return this.formatConceptResponse(existingSession.concept)
    }

    const sessionDay = existingSession?.day ?? todayRange.start

    const userFramework = await this.prismaService.userFramework.findFirst({
      where: {
        userId,
        active: true
      },
      include: {
        framework: {
          include: {
            discipline: {
              include: {
                domain: true
              }
            }
          }
        }
      }
    })

    if (!userFramework) {
      throw new NotFoundException('No active framework found for the user')
    }

    const lastCompletedConcept = await this.prismaService.userConceptProgress.findFirst({
      where: {
        userId,
        completed: true,
        concept: {
          frameworkId: userFramework.frameworkId
        },
      },
      orderBy: {
        concept: {
          order: 'desc'
        }
      },
      include: {
        concept: true
      }
    })

    const nextOrder = lastCompletedConcept ? lastCompletedConcept.concept.order + 1 : 1

    const nextConcept = await this.prismaService.concept.findUnique({
      where: {
        frameworkId_order: {
          frameworkId: userFramework.frameworkId,
          order: nextOrder
        }
      },
      include: {
        subtopics: {
          include: {
            practiceQuestions: true
          }
        }
      }
    })

    if (nextConcept && this.isConceptUsable(nextConcept)) {
      await this.upsertLearningSession(userId, nextConcept.id, sessionDay)
      return this.formatConceptResponse(nextConcept)
    }

    const aiPayload = {
      domain: userFramework.framework.discipline.domain.name,
      discipline: userFramework.framework.discipline.name,
      framework: userFramework.framework.name,
      lastConcept: lastCompletedConcept ? lastCompletedConcept.concept.name : null,
      nextConceptOrder: nextOrder
    }

    const prompt = this.buildConceptPrompt(aiPayload)
    const generatedConcept = await this.generateConceptFromAi(prompt)

    const subtopicCreates = generatedConcept.subtopics.map((subtopic, index) => ({
      name: subtopic.name,
      description: subtopic.description,
      order: index + 1,
      examples: subtopic.examples,
      practiceQuestions: {
        create: subtopic.practiceQuestions.map(question => ({
          title: question.title,
          question: question.question,
          answer: question.answer,
          difficulty: question.difficulty,
        }))
      }
    }))

    const conceptRecord = await this.prismaService.$transaction(async tx => {
      if (nextConcept) {
        await tx.practiceQuestion.deleteMany({
          where: {
            subtopic: {
              conceptId: nextConcept.id
            }
          }
        })

        await tx.subtopic.deleteMany({
          where: {
            conceptId: nextConcept.id
          }
        })

        return tx.concept.update({
          where: { id: nextConcept.id },
          data: {
            name: generatedConcept.name,
            description: generatedConcept.description,
            difficulty: generatedConcept.difficulty,
            estimatedMinutes: generatedConcept.estimatedMinutes,
            learningObjectives: generatedConcept.learningObjectives,
            evaluationCriteria: generatedConcept.evaluationCriteria,
            project: generatedConcept.project,
            subtopics: {
              create: subtopicCreates
            }
          },
          include: {
            subtopics: {
              include: {
                practiceQuestions: true
              }
            }
          }
        })
      }

      return tx.concept.create({
        data: {
          name: generatedConcept.name,
          description: generatedConcept.description,
          difficulty: generatedConcept.difficulty,
          estimatedMinutes: generatedConcept.estimatedMinutes,
          frameworkId: userFramework.frameworkId,
          order: nextOrder,
          learningObjectives: generatedConcept.learningObjectives,
          evaluationCriteria: generatedConcept.evaluationCriteria,
          project: generatedConcept.project,
          subtopics: {
            create: subtopicCreates
          }
        },
        include: {
          subtopics: {
            include: {
              practiceQuestions: true
            }
          }
        }
      })
    })

    await this.upsertLearningSession(userId, conceptRecord.id, sessionDay)

    return this.formatConceptResponse(conceptRecord)
  }

  // Build the prompt string that instructs the AI what to generate
  private buildConceptPrompt(payload: {
    domain: string
    discipline: string
    framework: string
    lastConcept: string | null
    nextConceptOrder: number
  }): string {
    const previousContext = payload.lastConcept
      ? `The learner just finished concept: "${payload.lastConcept}".`
      : `This is the learner's first concept.`

    return `
Generate the next concept in a progressive, hands-on learning path.

Context:
- Domain: ${payload.domain}
- Discipline: ${payload.discipline}
- Framework: ${payload.framework}
- ${previousContext}
- Concept number: ${payload.nextConceptOrder}

Rules (simple):
- Keep the concept as the logical next step.
- Use short, clear language.
- Keep examples and practice questions practical.

Output format:
- Return JSON only.
- No markdown.
- No extra text.

Use exactly this JSON shape:

{
  "name": "<concept name>",
  "description": "<clear practical explanation>",
  "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>",
  "estimatedMinutes": <realistic time>,

  "learningObjectives": [
    "<actionable outcome>",
    "<actionable outcome>"
  ],

  "evaluationCriteria": [
    "<how to verify correctness>",
    "<how to measure quality>"
  ],

  "project": {
    "title": "<mini project>",
    "description": "<what to build>",
    "requirements": [
      "<functional requirement>",
      "<functional requirement>"
    ],
    "expectedOutcome": "<working result>"
  },

  "subtopics": [
    {
      "name": "<subtopic>",
      "description": "<practical explanation>",

      "examples": [
        {
          "title": "<example>",
          "code": "<real working code>",
          "explanation": "<why it works>"
        }
      ],

      "practiceQuestions": [
        {
          "title": "<implementation task with real-world context>",
          "question": "<real coding task tied to a real scenario>",
          "answer": "<solution with code>",
          "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>"
        },
        {
          "title": "<debugging, optimization, or reliability task>",
          "question": "<broken or incomplete real-world scenario>",
          "answer": "<fixed solution>",
          "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>"
        }
      ]
    }
  ]
}
`.trim()
  }


  private validateGeneratedConcept(concept: GeneratedConcept) {
    const instance = plainToInstance(ConceptAiDto, concept)
    const errors = validateSync(instance, {
      whitelist: true,
      forbidUnknownValues: false
    })

    if (errors.length > 0) {
      throw new Error(`Invalid AI output: ${this.formatValidationErrors(errors)}`)
    }

    if (!instance.subtopics?.length) {
      throw new Error('Invalid AI output: Missing subtopics')
    }

    if (!instance.subtopics.some(subtopic => subtopic.practiceQuestions?.length)) {
      throw new Error('Invalid AI output: Missing practice questions')
    }
  }

  private isConceptUsable(concept: any): boolean {
    try {
      this.validateGeneratedConcept(concept)
      return true
    } catch {
      return false
    }
  }

  private formatConceptResponse(concept: any) {
    return {
      name: concept.name,
      description: concept.description,
      difficulty: concept.difficulty,
      estimatedMinutes: concept.estimatedMinutes,
      learningObjectives: concept.learningObjectives,
      evaluationCriteria: concept.evaluationCriteria,
      project: concept.project,
      subtopics: (concept.subtopics || []).map((subtopic: any) => ({
        name: subtopic.name,
        description: subtopic.description,
        examples: subtopic.examples,
        practiceQuestions: (subtopic.practiceQuestions || []).map((question: any) => ({
          title: question.title,
          question: question.question,
          answer: question.answer,
          difficulty: question.difficulty,
        })),
      })),
    }
  }


  // method to get the concept for the logging user
  async getConcept(userId: string) {
    const todayRange = this.getDayRange(new Date())
    const todaysSession = await this.findTodaysSession(userId, todayRange)

    if (!todaysSession) {
      return this.createConcept(userId)
    }

    if (!todaysSession.concept) {
      throw new NotFoundException('Learning session exists but concept is missing')
    }

    return this.formatConceptResponse(todaysSession.concept)
  }

  private async generateConceptFromAi(prompt: string): Promise<GeneratedConcept> {
    let lastErrorMessage = ''

    for (let i = 0; i < 3; i++) {
      const rawJson = await this.aiService.generateText(prompt)

      if (!rawJson) {
        if (i === 2) {
          throw new ConflictException(`Failed to generate valid concept after ${i + 1} attempts`)
        }
        continue
      }

      try {
        const parsed = JSON.parse(rawJson) as GeneratedConcept
        this.validateGeneratedConcept(parsed)
        return parsed
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : 'Invalid AI output'
        if (i === 2) {
          throw new ConflictException(`Failed to generate valid concept after ${i + 1} attempts: ${lastErrorMessage}`)
        }
      }
    }

    throw new ConflictException('Failed to generate valid concept')
  }

  private formatValidationErrors(errors: Array<{ property: string; constraints?: Record<string, string>; children?: any[] }>) {
    const messages: string[] = []

    const walk = (items: Array<{ property: string; constraints?: Record<string, string>; children?: any[] }>, path = '') => {
      for (const item of items) {
        const nextPath = path ? `${path}.${item.property}` : item.property
        if (item.constraints) {
          messages.push(`${nextPath}: ${Object.values(item.constraints).join(', ')}`)
        }
        if (item.children?.length) {
          walk(item.children, nextPath)
        }
      }
    }

    walk(errors)

    return messages.join(' | ')
  }

  private getDayRange(date: Date) {
    const start = new Date(date)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)

    return { start, end }
  }

  private async findTodaysSession(userId: string, range: { start: Date; end: Date }) {
    return this.prismaService.learningSession.findFirst({
      where: {
        userId,
        day: {
          gte: range.start,
          lt: range.end
        }
      },
      include: {
        concept: {
          include: {
            subtopics: {
              include: {
                practiceQuestions: true
              }
            }
          }
        }
      }
    })
  }

  private async upsertLearningSession(userId: string, conceptId: string, day: Date) {
    await this.prismaService.learningSession.upsert({
      where: {
        userId_day: {
          userId,
          day
        }
      },
      create: {
        userId,
        conceptId,
        day
      },
      update: {
        conceptId
      }
    })
  }


  // Marks a concept as completed for the user and records progress.
  // Request body (all optional):
  // - conceptId: explicit concept to complete (defaults to today's session concept)
  // - score: concept score
  // - projectScore: mini project score
  // - projectCompleted: whether the mini project is completed
  // - feedback: short completion note
  // Behavior: upserts progress + project records and closes today's session when applicable.
  async completeConcept(userId: string, payload: CompleteConceptDto) {
    // Resolve today's session so we can default to the current concept.
    const todayRange = this.getDayRange(new Date())
    const todaysSession = await this.findTodaysSession(userId, todayRange)

    // Allow explicit concept completion or fall back to today's concept.
    const conceptId = payload.conceptId ?? todaysSession?.conceptId

    if (!conceptId) {
      throw new NotFoundException('No learning session found for today')
    }

    // Single timestamp used for completion and optional project completion.
    const completedAt = new Date()

    await this.prismaService.$transaction(async tx => {
      // Upsert progress so repeated calls update score/feedback safely.
      await tx.userConceptProgress.upsert({
        where: {
          userId_conceptId: { userId, conceptId }
        },
        create: {
          userId,
          conceptId,
          completed: true,
          completedAt,
          score: payload.score,
          projectScore: payload.projectScore,
          projectCompleted: payload.projectCompleted ?? false,
          feedback: payload.feedback
        },
        update: {
          completed: true,
          completedAt,
          score: payload.score,
          projectScore: payload.projectScore,
          projectCompleted: payload.projectCompleted ?? false,
          feedback: payload.feedback
        }
      })

      // Create or update the user's concept project record for scoring.
      await tx.userConceptProject.upsert({
        where: {
          userId_conceptId: { userId, conceptId }
        },
        create: {
          userId,
          conceptId,
          completedAt: payload.projectCompleted ? completedAt : null,
          score: payload.projectScore
        },
        update: {
          completedAt: payload.projectCompleted ? completedAt : null,
          score: payload.projectScore
        }
      })

      // Mark today's session as completed when it is the active concept.
      if (todaysSession?.id && !payload.conceptId) {
        await tx.learningSession.update({
          where: { id: todaysSession.id },
          data: { completed: true }
        })
      }
    })

    return { message: 'Concept marked as completed', conceptId }
  }
}

