import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AiCreditsService } from '../ai-credits/ai-credits.service';
import { AdminService } from '../admin/admin.service';

interface UserCreatedPayload {
  id: string;
  mobileNumber?: string;
  email?: string;
  via: 'mobile' | 'google';
  occurredAt: string;
}

@Controller()
export class UserEventsController {
  private readonly logger = new Logger(UserEventsController.name);

  constructor(
    private readonly aiCreditsService: AiCreditsService,
    private readonly adminService: AdminService,
  ) {}

  @EventPattern('user.created')
  async onUserCreated(@Payload() payload: UserCreatedPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const config = await this.adminService.getConfig();
      const credits = config?.signupAiCredits ?? 20;

      if (credits > 0) {
        await this.aiCreditsService.grant(payload.id, credits, 'signup_bonus');
        this.logger.log(`Granted ${credits} signup AI credits to user ${payload.id}`);
      }

      channel.ack(originalMsg);
    } catch (err) {
      this.logger.error(`Failed to process user.created for ${payload.id}: ${(err as Error).message}`);
      // Nack without requeue to avoid poison-pill loops
      channel.nack(originalMsg, false, false);
    }
  }
}
