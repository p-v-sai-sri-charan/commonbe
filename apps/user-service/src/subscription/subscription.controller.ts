import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApplySubscriptionDto } from './dto/apply-subscription.dto';
import { AcceptCoupleInviteDto, SendCoupleInviteDto } from './dto/couple-invite.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscription')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway', required: true })
@Controller('users/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  /** Returns the full plan catalog — no auth required. */
  @Get('plans')
  listPlans() {
    return this.subscriptionService.listPlans();
  }

  /** Returns the authenticated user's current subscription (defaults to free). */
  @Get('me')
  getMySubscription(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getMySubscription(this.requireUserId(userId));
  }

  /**
   * Internal, service-to-service only.
   * Called by payment-service after a payment has been verified.
   * Not proxied through api-gateway.
   */
  @Post('internal/apply')
  applySubscription(
    @Headers('x-user-id') userId: string,
    @Body() dto: ApplySubscriptionDto,
  ) {
    return this.subscriptionService.applySubscription(
      this.requireUserId(userId),
      dto,
    );
  }

  /** Cancel the authenticated user's subscription (retains access until period ends). */
  @Post('cancel')
  cancelSubscription(
    @Headers('x-user-id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.subscriptionService.cancelSubscription(
      this.requireUserId(userId),
      body.reason,
    );
  }

  // ── Couple plan invite endpoints ────────────────────────────────────────────

  /** Send a partner invite (Couple plan holders only). */
  @Post('couple/invite')
  sendCoupleInvite(
    @Headers('x-user-id') userId: string,
    @Body() dto: SendCoupleInviteDto,
  ) {
    return this.subscriptionService.sendCoupleInvite(this.requireUserId(userId), dto);
  }

  /** Accept a partner invite using the token received via SMS/deep-link. */
  @Post('couple/accept')
  acceptCoupleInvite(
    @Headers('x-user-id') userId: string,
    @Body() dto: AcceptCoupleInviteDto,
  ) {
    return this.subscriptionService.acceptCoupleInvite(this.requireUserId(userId), dto);
  }
}
