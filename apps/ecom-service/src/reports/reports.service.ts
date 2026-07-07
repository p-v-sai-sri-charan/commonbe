import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportDocument, ReportStatus } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
  ) {}

  async create(reporterUserId: string, dto: CreateReportDto): Promise<Report> {
    const design = await this.designModel.findById(dto.designId);
    if (!design) throw new NotFoundException('Design not found');

    const existing = await this.reportModel.findOne({
      designId: new Types.ObjectId(dto.designId),
      reporterUserId,
      status: 'open',
    });
    if (existing) throw new BadRequestException('You already have an open report for this design');

    return this.reportModel.create({
      designId: new Types.ObjectId(dto.designId),
      reporterUserId,
      reason: dto.reason,
      details: dto.details ?? null,
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async adminList(
    status?: ReportStatus,
    page = 1,
    limit = 20,
  ): Promise<{ reports: Report[]; total: number }> {
    const filter = status ? { status } : {};
    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reportModel.countDocuments(filter),
    ]);
    return { reports, total };
  }

  async adminUpdateStatus(id: string, status: ReportStatus): Promise<Report> {
    const report = await this.reportModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  /** Called after an admin takedown so the queue doesn't keep showing handled reports. */
  async resolveAllForDesign(designId: string): Promise<void> {
    await this.reportModel.updateMany(
      { designId: new Types.ObjectId(designId), status: 'open' },
      { status: 'resolved' },
    );
  }
}
