import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssessmentService } from '../assessment/assessment.service';
import { LogProgressDto } from './dto/log-progress.dto';
import { ProgressLog, ProgressLogDocument } from './schemas/progress-log.schema';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(ProgressLog.name) private readonly progressLogModel: Model<ProgressLogDocument>,
    private readonly assessmentService: AssessmentService,
  ) {}

  async logProgress(authUserId: string, dto: LogProgressDto): Promise<ProgressLog> {
    const date = dto.date ?? new Date().toISOString().slice(0, 10);

    const log = await this.progressLogModel.findOneAndUpdate(
      { authUserId, date },
      { $set: { ...dto, authUserId, date } },
      { new: true, upsert: true },
    );

    // Daily logging is a natural cadence to also refresh the score trend.
    await this.assessmentService.snapshotScores(authUserId);

    return log;
  }

  async getLogs(authUserId: string, limit = 30): Promise<ProgressLog[]> {
    return this.progressLogModel.find({ authUserId }).sort({ date: -1 }).limit(limit);
  }
}
