import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ConceptService {

  constructor(
    // 1. ai service 
    private aiService: AiService,
    //  2. prisma service
    private prismaService: PrismaService
  ) { }

  // method to develop a concept for learning using ai service to pass the data
  async createConcept(userId: string) {
    // Identify the user’s active framework

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

    // 2. Find the last completed concept (showing the progress of the user)
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


    // 3. Determine the next concept order
    const nextOrder = lastCompletedConcept ? lastCompletedConcept.concept.order + 1 : 1
    // If the user has never completed a concept, they start at order 1.

    // 4.  Check if the concept already exists
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
      return this.formatConceptResponse(nextConcept)
    }

    // 5. Generate a concept using the AI service
    //  payload for the ai service
    const aiPayload = {
      domain: userFramework.framework.discipline.domain.name,
      discipline: userFramework.framework.discipline.name,
      framework: userFramework.framework.name,
      lastConcept: lastCompletedConcept ? lastCompletedConcept.concept.name : null,
      nextConceptOrder: nextOrder
    }

    const prompt = this.buildConceptPrompt(aiPayload)
    let generatedConcept: any = null

    // Retry mechanism includes the first generation attempt.
    for (let i = 0; i < 3; i++) {
      const rawJson = await this.aiService.generateText(prompt)

      if (!rawJson) {
        if (i === 2) {
          throw new ConflictException(`Failed to generate valid concept after ${i + 1} attempts`)
        }
        continue
      }

      try {
        const parsed = JSON.parse(rawJson)
        this.validateGeneratedConcept(parsed)

        generatedConcept = parsed
        break
      } catch (error) {
        if (i === 2) {
          throw new ConflictException(`Failed to generate valid concept after ${i + 1} attempts`)
        }
      }
    }

    let conceptId: string

    if (nextConcept) {
      await this.prismaService.practiceQuestion.deleteMany({
        where: {
          subtopic: {
            conceptId: nextConcept.id
          }
        }
      })

      await this.prismaService.subtopic.deleteMany({
        where: {
          conceptId: nextConcept.id
        }
      })

      const updatedConcept = await this.prismaService.concept.update({
        where: { id: nextConcept.id },
        data: {
          name: generatedConcept.name,
          description: generatedConcept.description,
          difficulty: generatedConcept.difficulty,
          estimatedMinutes: generatedConcept.estimatedMinutes,
          learningObjectives: generatedConcept.learningObjectives,
          evaluationCriteria: generatedConcept.evaluationCriteria,
          project: generatedConcept.project
        },
      })

      conceptId = updatedConcept.id
    } else {
      const createdConcept = await this.prismaService.concept.create({
        data: {
          name: generatedConcept.name,
          description: generatedConcept.description,
          difficulty: generatedConcept.difficulty,
          estimatedMinutes: generatedConcept.estimatedMinutes,
          frameworkId: userFramework.frameworkId,
          order: nextOrder,
          learningObjectives: generatedConcept.learningObjectives,
          evaluationCriteria: generatedConcept.evaluationCriteria,
          project: generatedConcept.project
        },
      })

      conceptId = createdConcept.id
    }

    // 6. Save the generated concept to the database
    for (let i = 0; i < generatedConcept.subtopics.length; i++) {

      const subtopicData = generatedConcept.subtopics[i]

      const subtopic = await this.prismaService.subtopic.create({
        data: {
          name: subtopicData.name,
          description: subtopicData.description,
          order: i + 1,
          conceptId,
          examples: subtopicData.examples,
        }
      })

      for (const question of subtopicData.practiceQuestions) {
        await this.prismaService.practiceQuestion.create({
          data: {
            title: question.title,
            question: question.question,
            answer: question.answer,
            difficulty: question.difficulty,
            subtopicId: subtopic.id
          }
        })
      }



    }

    // Create a learning session
    await this.prismaService.learningSession.create({
      data: {
        userId,
        conceptId,
        day: new Date()
      }
    })

    //  Return the final concept
    const savedConcept = await this.prismaService.concept.findUnique({
      where: { id: conceptId },
      include: {
        subtopics: {
          include: {
            practiceQuestions: true
          }
        }
      }
    })

    if (!savedConcept) {
      throw new NotFoundException('Generated concept could not be loaded after creation')
    }

    return this.formatConceptResponse(savedConcept)
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
Generate the next concept in a progressive, hands-on coding path.

Goal:
- Build real skills through implementation, debugging, and delivery.
- No theory-only learning.

Context:
- Domain: ${payload.domain}
- Discipline: ${payload.discipline}
- Framework: ${payload.framework}
- ${previousContext}
- Concept number: ${payload.nextConceptOrder}

Rules (short and strict):
- Follow the official learning progression for ${payload.framework}.
- Keep the concept as the logical next step.
- Do not skip prerequisites or jump to advanced topics.
- Keep tasks practical, production-like, and outcome-focused.
- Every practice question must require writing or fixing real code.
- No "what is", "define", or explanation-only questions.
- Use realistic constraints (bugs, features, refactors, tests, performance, reliability, maintainability).

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


  private validateGeneratedConcept(concept: any) {

    // 1. Ensure required fields exist
    if (!concept.learningObjectives?.length) {
      throw new Error('Invalid AI output: Missing learning objectives')
    }

    if (!concept.evaluationCriteria?.length) {
      throw new Error('Invalid AI output: Missing evaluation criteria')
    }

    if (!concept.project) {
      throw new Error('Invalid AI output: Missing project')
    }

    for (const subtopic of concept.subtopics || []) {

      // 2. Ensure examples exist
      if (!subtopic.examples || subtopic.examples.length === 0) {
        throw new Error(`Invalid AI output: Subtopic "${subtopic.name}" missing examples`)
      }

      if (!subtopic.practiceQuestions || subtopic.practiceQuestions.length === 0) {
        throw new Error(`Invalid AI output: Subtopic "${subtopic.name}" missing practice questions`)
      }

      for (const q of subtopic.practiceQuestions || []) {

        const questionText = `${q.title || ''} ${q.question || ''}`.toLowerCase()

        // 3. Reject theoretical questions
        const forbiddenPatterns = [
          'what is',
          'define',
          'explain',
          'why',
          'difference between',
          'compare',
          'which decorator',
          'what does',
          'what command'
        ]

        const isTheoretical = forbiddenPatterns.some(p => questionText.includes(p))

        if (isTheoretical) {
          throw new Error(`Invalid AI output: Theoretical question detected -> "${q.title}"`)
        }

        // 4. Enforce coding requirement
        const mustContain = [
          'create',
          'implement',
          'build',
          'fix',
          'write',
          'modify',
          'refactor',
          'debug',
          'optimize',
          'add',
          'update',
          'complete',
          'integrate',
          'test',
          'bootstrap',
          'endpoint',
          'api',
          'function',
          'class',
          'module'
        ]

        const hasCodingIntent = mustContain.some(p => questionText.includes(p))

        if (!hasCodingIntent) {
          throw new Error(`Invalid AI output: Question is not a coding task -> "${q.title}"`)
        }

        // 5. Ensure answer contains code
        if (!q.answer.includes('{') || !q.answer.includes('}')) {
          throw new Error(`Invalid AI output: Answer likely missing code -> "${q.title}"`)
        }
      }
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
    
  }
}

