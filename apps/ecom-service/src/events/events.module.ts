import { Module } from '@nestjs/common';
import { UserEventsController } from './user-events.controller';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AiCreditsModule, AdminModule],
  controllers: [UserEventsController],
})
export class EventsModule {}
