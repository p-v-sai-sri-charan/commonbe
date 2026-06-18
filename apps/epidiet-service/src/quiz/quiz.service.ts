import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QUIZ_QUESTIONS } from './data/quiz-questions.data';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { QuizQuestion } from './interfaces/quiz-question.interface';
import { QuizAnswer, QuizAnswerDocument } from './schemas/quiz-answer.schema';

export interface ReviewPanelItem {
  question: QuizQuestion;
  isAnswered: boolean;
  value?: string[];
}

export type ReviewPanelBySection = Record<string, ReviewPanelItem[]>;

@Injectable()
export class QuizService {
  constructor(@InjectModel(QuizAnswer.name) private readonly answerModel: Model<QuizAnswerDocument>) {}

  getQuestions(section?: string): QuizQuestion[] {
    return section ? QUIZ_QUESTIONS.filter((q) => q.section === section) : QUIZ_QUESTIONS;
  }

  getQuestionById(questionId: string): QuizQuestion | undefined {
    return QUIZ_QUESTIONS.find((q) => q.id === questionId);
  }

  async submitAnswer(authUserId: string, dto: SubmitAnswerDto): Promise<QuizAnswer> {
    const question = this.getQuestionById(dto.questionId);
    if (!question) {
      throw new BadRequestException(`Unknown questionId "${dto.questionId}"`);
    }
    if (question.options && !dto.value.every((v) => question.options!.some((o) => o.value === v))) {
      throw new BadRequestException(`Invalid value for question "${dto.questionId}"`);
    }

    return this.answerModel.findOneAndUpdate(
      { authUserId, questionId: dto.questionId },
      { $set: { value: dto.value } },
      { new: true, upsert: true },
    );
  }

  /** Returns { questionId: value[] } for every answer this user has given. */
  async getAnswersMap(authUserId: string): Promise<Record<string, string[]>> {
    const answers = await this.answerModel.find({ authUserId });
    return Object.fromEntries(answers.map((a) => [a.questionId, a.value]));
  }

  private isRelevant(question: QuizQuestion, answersMap: Record<string, string[]>): boolean {
    if (!question.dependsOn) return true;
    const dependencyValue = answersMap[question.dependsOn.questionId];
    if (!dependencyValue) return false;
    return dependencyValue.some((v) => question.dependsOn!.equals.includes(v));
  }

  /**
   * Powers the "Question Review Panel": every question grouped by section,
   * with isAnswered/value — questions whose dependsOn condition isn't
   * currently satisfied are omitted entirely (even if previously answered).
   */
  async getReviewPanel(authUserId: string): Promise<ReviewPanelBySection> {
    const answersMap = await this.getAnswersMap(authUserId);
    const bySection: ReviewPanelBySection = {};

    for (const question of QUIZ_QUESTIONS) {
      if (!this.isRelevant(question, answersMap)) continue;

      bySection[question.section] ??= [];
      bySection[question.section].push({
        question,
        isAnswered: Boolean(answersMap[question.id]),
        value: answersMap[question.id],
      });
    }

    return bySection;
  }
}
