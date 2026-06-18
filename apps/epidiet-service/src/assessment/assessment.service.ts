import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EpigeneticPathway } from '../common/enums';
import { QuizService } from '../quiz/quiz.service';
import {
  EpigeneticScoreSnapshot,
  EpigeneticScoreSnapshotDocument,
} from './schemas/epigenetic-score-snapshot.schema';

export type PathwayScoreMap = Record<EpigeneticPathway, number> & { overall: number };

@Injectable()
export class AssessmentService {
  constructor(
    private readonly quizService: QuizService,
    @InjectModel(EpigeneticScoreSnapshot.name)
    private readonly snapshotModel: Model<EpigeneticScoreSnapshotDocument>,
  ) {}

  /** Computes live pathway scores (0-100) from the user's current quiz answers. */
  async computeScores(authUserId: string): Promise<PathwayScoreMap> {
    const answersMap = await this.quizService.getAnswersMap(authUserId);
    const pathwayQuestions = this.quizService
      .getQuestions('epigenetic_pathways')
      .filter((q) => q.pathway && q.options);

    const totals: Record<string, { earned: number; possible: number }> = {};

    for (const question of pathwayQuestions) {
      const pathway = question.pathway!;
      totals[pathway] ??= { earned: 0, possible: 0 };

      const maxScore = Math.max(...question.options!.map((o) => o.score ?? 0));
      totals[pathway].possible += maxScore;

      const answer = answersMap[question.id]?.[0];
      const selected = question.options!.find((o) => o.value === answer);
      totals[pathway].earned += selected?.score ?? 0;
    }

    const scores = {} as PathwayScoreMap;
    let earnedSum = 0;
    let possibleSum = 0;

    for (const pathway of Object.values(EpigeneticPathway)) {
      const total = totals[pathway];
      const pct = total && total.possible > 0 ? Math.round((total.earned / total.possible) * 100) : 0;
      scores[pathway] = pct;
      if (total) {
        earnedSum += total.earned;
        possibleSum += total.possible;
      }
    }

    scores.overall = possibleSum > 0 ? Math.round((earnedSum / possibleSum) * 100) : 0;
    return scores;
  }

  async snapshotScores(authUserId: string): Promise<EpigeneticScoreSnapshot> {
    const scores = await this.computeScores(authUserId);
    return this.snapshotModel.create({ authUserId, scores });
  }

  /** Compares the two most recent snapshots and produces plain-English insights. */
  async getTrend(authUserId: string) {
    const [latest, previous] = await this.snapshotModel
      .find({ authUserId })
      .sort({ createdAt: -1 })
      .limit(2);

    if (!latest) {
      return { current: await this.computeScores(authUserId), insights: [] as string[] };
    }
    if (!previous) {
      return { current: latest.scores, insights: [] as string[] };
    }

    const insights: string[] = [];
    const labels: Record<string, string> = {
      methylation: 'methylation support',
      histone_modification: 'inflammation control',
      oxidative_stress: 'antioxidant capacity',
      gut_microbiome: 'gut microbiome health',
      overall: 'overall epigenetic score',
    };

    for (const [key, label] of Object.entries(labels)) {
      const current = (latest.scores as unknown as Record<string, number>)[key] ?? 0;
      const prior = (previous.scores as unknown as Record<string, number>)[key] ?? 0;
      const delta = current - prior;
      if (delta !== 0) {
        insights.push(`Your ${label} has ${delta > 0 ? 'improved' : 'declined'} ${Math.abs(delta)}% since your last check-in.`);
      }
    }

    return { current: latest.scores, previous: previous.scores, insights };
  }
}
