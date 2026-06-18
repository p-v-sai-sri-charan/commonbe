import { IsIn, IsString } from 'class-validator';
import { PLAN_PRICES } from '../subscription-prices';

export class CreateSubscriptionOrderDto {
  @IsString()
  @IsIn(Object.keys(PLAN_PRICES))
  planId: string;
}
