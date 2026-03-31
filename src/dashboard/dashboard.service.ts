import { Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { ConceptService } from 'src/concept/concept.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenerateRoadmapDto } from './dto/roadmap.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conceptService: ConceptService,
    private readonly aiService: AiService,
  ) {}

  async getOverview(userId: string) {
    const activeFramework = await this.prisma.userFramework.findFirst({
      where: {
        userId,
        active: true,
      },
      select: {
        frameworkId: true,
      },
    });

    if (!activeFramework) {
      throw new NotFoundException('No active framework found for the user');
    }

    const [todayFocus, timeline, concepts, progressRows, project] = await Promise.all([
      this.conceptService.getConcept(userId),
      this.conceptService.getLearningTimeline(userId),
      this.prisma.concept.findMany({
        where: {
          frameworkId: activeFramework.frameworkId,
        },
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          order: true,
          name: true,
          description: true,
        },
      }),
      this.prisma.userConceptProgress.findMany({
        where: {
          userId,
          completed: true,
          concept: {
            frameworkId: activeFramework.frameworkId,
          },
        },
        select: {
          conceptId: true,
        },
      }),
      this.prisma.mainProject.findFirst({
        where: {
          frameworkId: activeFramework.frameworkId,
        },
        include: {
          steps: {
            orderBy: {
              order: 'asc',
            },
            include: {
              userProgress: {
                where: {
                  userId,
                },
                select: {
                  completed: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const completedSet = new Set(progressRows.map((item) => item.conceptId));
    const total = concepts.length;
    const completed = completedSet.size;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    let roadmapPreview: Array<{
      id: string;
      order: number;
      name: string;
      description: string | null;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED';
    }> = [];

    if (project?.steps?.length) {
      let unlocked = true;

      roadmapPreview = project.steps.slice(0, 8).map((step) => {
        const stepCompleted = Boolean(step.userProgress?.[0]?.completed);
        const status: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' = stepCompleted
          ? 'COMPLETED'
          : unlocked
            ? 'IN_PROGRESS'
            : 'LOCKED';

        if (!stepCompleted && unlocked) {
          unlocked = false;
        }

        return {
          id: step.id,
          order: step.order,
          name: step.title,
          description: step.description,
          status,
        };
      });
    } else {
      roadmapPreview = concepts.slice(0, 8).map((concept) => ({
        id: concept.id,
        order: concept.order,
        name: concept.name,
        description: concept.description,
        status: completedSet.has(concept.id)
          ? 'COMPLETED'
          : concept.id === timeline.todayConcept.id
            ? 'IN_PROGRESS'
            : 'LOCKED',
      }));
    }

    return {
      todayFocus,
      progress: {
        completed,
        total,
        percentage,
      },
      roadmapPreview,
      timeline,
    };
  }

  async generateRoadmapGuide(userId: string, dto: GenerateRoadmapDto) {
    const frameworkName = dto.framework.trim();
    const disciplineName = dto.discipline.trim();
    const domainName = dto.domain.trim();

    const frameworkRecord = await this.prisma.framework.findFirst({
      where: {
        name: {
          equals: frameworkName,
          mode: 'insensitive',
        },
      },
      include: {
        discipline: {
          include: {
            domain: true,
          },
        },
        concepts: {
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            order: true,
            name: true,
            description: true,
            learningObjectives: true,
            estimatedMinutes: true,
          },
        },
      },
    });

    const docsUrl = this.getFrameworkDocumentationUrl(frameworkName);
    const matchedConcepts = frameworkRecord?.concepts ?? [];

    const roadmapFromDb = matchedConcepts.map((concept) => ({
      id: concept.id,
      order: concept.order,
      title: concept.name,
      description: concept.description,
      learningObjectives: concept.learningObjectives,
      estimatedMinutes: concept.estimatedMinutes,
    }));

    const aiNarrative = await this.generateRoadmapNarrative({
      domain: domainName,
      discipline: disciplineName,
      framework: frameworkName,
      concepts: roadmapFromDb,
    });

    const selectedMatchesUser = await this.prisma.userFramework.findFirst({
      where: {
        userId,
        active: true,
        framework: {
          name: {
            equals: frameworkName,
            mode: 'insensitive',
          },
        },
      },
      select: {
        id: true,
      },
    });

    return {
      domain: frameworkRecord?.discipline.domain.name ?? domainName,
      discipline: frameworkRecord?.discipline.name ?? disciplineName,
      framework: frameworkRecord?.name ?? frameworkName,
      documentation: {
        label: `${frameworkName} official documentation`,
        url: docsUrl,
      },
      roadmap: {
        source: roadmapFromDb.length > 0 ? 'DATABASE_AI_CONTENT' : 'GENERATED_TEXT_ONLY',
        items: roadmapFromDb,
        narrative: aiNarrative,
      },
      userContext: {
        isActiveSelection: Boolean(selectedMatchesUser),
      },
    };
  }

  private getFrameworkDocumentationUrl(framework: string) {
    const key = framework.trim().toLowerCase();

    const docsMap: Record<string, string> = {
      react: 'https://react.dev/learn',
      'node.js': 'https://nodejs.org/en/learn',
      node: 'https://nodejs.org/en/learn',
      nestjs: 'https://docs.nestjs.com/',
      typescript: 'https://www.typescriptlang.org/docs/',
      python: 'https://docs.python.org/3/tutorial/',
      'next.js': 'https://nextjs.org/docs',
      nextjs: 'https://nextjs.org/docs',
      vue: 'https://vuejs.org/guide/introduction.html',
      angular: 'https://angular.dev/tutorials/learn-angular',
    };

    return docsMap[key] ?? 'https://developer.mozilla.org/en-US/docs/Learn';
  }

  private async generateRoadmapNarrative(payload: {
    domain: string;
    discipline: string;
    framework: string;
    concepts: Array<{
      order: number;
      title: string;
      description: string | null;
      learningObjectives: string[];
      estimatedMinutes: number | null;
    }>;
  }) {
    const conceptsSummary =
      payload.concepts.length > 0
        ? payload.concepts
            .slice(0, 12)
            .map(
              (item) =>
                `${item.order}. ${item.title} - ${item.description ?? 'No description'} | Objectives: ${item.learningObjectives.join(
                  '; ',
                )}`,
            )
            .join('\n')
        : 'No saved concepts found yet for this framework.';

    const prompt = `
Create a concise learning roadmap explanation for a developer.

Context:
- Domain: ${payload.domain}
- Discipline: ${payload.discipline}
- Framework: ${payload.framework}
- Existing roadmap data:
${conceptsSummary}

Output rules:
- Return valid JSON only.
- No markdown.
- Keep language direct and practical.

Return shape:
{
  "overview": "<1 short paragraph about what the learner will achieve>",
  "expectations": [
    "<clear expectation>",
    "<clear expectation>",
    "<clear expectation>"
  ],
  "phases": [
    {
      "title": "<phase name>",
      "goal": "<what this phase builds>"
    }
  ]
}
`.trim();

    try {
      const raw = await this.aiService.generateText(prompt);
      if (!raw) {
        throw new Error('Empty AI response');
      }

      const parsed = JSON.parse(raw) as {
        overview?: string;
        expectations?: string[];
        phases?: Array<{ title?: string; goal?: string }>;
      };

      return {
        overview:
          parsed.overview?.trim() ??
          `You will learn ${payload.framework} progressively through practical concepts and implementation tasks.`,
        expectations:
          parsed.expectations?.filter((item) => item?.trim().length > 0) ??
          [
            'Understand the core concepts in sequence, not randomly.',
            'Apply each concept in code before moving to the next one.',
            'Finish with project-ready implementation confidence.',
          ],
        phases:
          parsed.phases
            ?.filter((phase) => phase.title?.trim() && phase.goal?.trim())
            .map((phase) => ({
              title: phase.title!.trim(),
              goal: phase.goal!.trim(),
            })) ?? [],
      };
    } catch {
      return {
        overview: `You will learn ${payload.framework} through a structured sequence designed for ${payload.discipline} within ${payload.domain}.`,
        expectations: [
          'Build understanding from fundamentals to advanced application.',
          'Practice with concrete tasks tied to each concept.',
          'Track progress and know exactly what comes next.',
        ],
        phases: [
          { title: 'Foundation', goal: 'Understand the core syntax and development workflow.' },
          { title: 'Applied Concepts', goal: 'Implement real features and solve practical tasks.' },
          { title: 'Project Readiness', goal: 'Combine concepts into production-style deliverables.' },
        ],
      };
    }
  }
}
