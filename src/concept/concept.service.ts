import { Injectable, NotFoundException } from '@nestjs/common';
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

    if (nextConcept) {
      return nextConcept
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
    const rawJson = await this.aiService.generateText(prompt)

    if (!rawJson) {
      throw new Error('AI service returned an empty response')
    }

    const generatedConcept = JSON.parse(rawJson)

    const createdConcept = await this.prismaService.concept.create({
      data: {
        name: generatedConcept.name,
        description: generatedConcept.description,
        difficulty: generatedConcept.difficulty,
        estimatedMinutes: generatedConcept.estimatedMinutes,
        frameworkId: userFramework.frameworkId,
        order: nextOrder,
      },
    })

    // 6. Save the generated concept to the database
    for (let i = 0; i < generatedConcept.subtopics.length; i++) {

      const subtopicData = generatedConcept.subtopics[i]

      const subtopic = await this.prismaService.subtopic.create({
        data: {
          name: subtopicData.name,
          description: subtopicData.description,
          order: i + 1,
          conceptId: createdConcept.id
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
        conceptId: createdConcept.id,
        day: new Date()
      }
    })

    //  Return the final concept
    const savedConcept = await this.prismaService.concept.findUnique({
      where: { id: createdConcept.id },
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

    return {
      name: savedConcept.name,
      description: savedConcept.description,
      difficulty: savedConcept.difficulty,
      estimatedMinutes: savedConcept.estimatedMinutes,
      subtopics: savedConcept.subtopics.map((subtopic) => ({
        name: subtopic.name,
        description: subtopic.description,
        practiceQuestions: subtopic.practiceQuestions.map((question) => ({
          title: question.title,
          question: question.question,
          answer: question.answer,
          difficulty: question.difficulty,
        })),
      })),
    }
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
        You are generating structured learning content for a personal growth platform.

Context:
- Domain: ${payload.domain}
- Discipline: ${payload.discipline}
- Framework / Technology: ${payload.framework}
- ${previousContext}
- This is concept number ${payload.nextConceptOrder} in the learning path.

Task:
Generate the next logical concept for the learner to study.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences — in exactly this shape:

{
  "name": "<concept name>",
  "description": "<clear 1-2 sentence description of the concept>",
  "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>",
  "estimatedMinutes": <number>,
  "subtopics": [
    {
      "name": "<subtopic name>",
      "description": "<clear 1-2 sentence description>",
      "practiceQuestions": [
        {
          "title": "<short question title>",
          "question": "<the full question>",
          "answer": "<concise but complete answer>",
          "difficulty": "<BEGINNER | INTERMEDIATE | ADVANCED>"
        }
      ]
    }
  ]
}

Rules:
- Include 2 to 4 subtopics that logically break down the concept.
- Include 1 to 3 practice questions per subtopic.
- Choose difficulty based on the concept's position (order ${payload.nextConceptOrder}) in the path.
- Keep the content accurate, practical, and relevant to ${payload.framework}.
- Output ONLY the JSON object. Do not wrap it in markdown or add any extra text.
`.trim()
  }
}

