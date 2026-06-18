import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { QuizService } from './quiz.service';

@ApiTags('epidiet/quiz')
@Controller('epidiet/quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Get('questions')
  getQuestions(@Query('section') section?: string) {
    return this.quizService.getQuestions(section);
  }

  @ApiHeader({ name: 'x-user-id', required: true })
  @Post('answers')
  submitAnswer(@Headers('x-user-id') userId: string, @Body() dto: SubmitAnswerDto) {
    return this.quizService.submitAnswer(this.requireUserId(userId), dto);
  }

  @ApiHeader({ name: 'x-user-id', required: true })
  @Get('answers/me')
  getAnswers(@Headers('x-user-id') userId: string) {
    return this.quizService.getAnswersMap(this.requireUserId(userId));
  }

  /** Powers the ✏️ Question Review Panel overlay. */
  @ApiHeader({ name: 'x-user-id', required: true })
  @Get('review-panel/me')
  getReviewPanel(@Headers('x-user-id') userId: string) {
    return this.quizService.getReviewPanel(this.requireUserId(userId));
  }
}
