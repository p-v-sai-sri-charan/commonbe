/**
 * Authoritative price list for subscription plans, mirrored from
 * user-service/src/subscription/plans.config.ts.
 *
 * Payment-service only needs IDs and prices to create Razorpay orders.
 * Feature definitions, trial logic, and quota mapping all live in
 * user-service. Keep these two in sync whenever prices change.
 */
export interface PlanPrice {
  priceInPaise: number;
  displayName: string;
}

export const PLAN_PRICES: Record<string, PlanPrice> = {
  plus_monthly:   { priceInPaise: 19_900,  displayName: 'Plus Monthly'         },
  plus_annual:    { priceInPaise: 149_900, displayName: 'Plus Annual'          },
  pro_monthly:    { priceInPaise: 39_900,  displayName: 'Pro Monthly'          },
  pro_annual:     { priceInPaise: 299_900, displayName: 'Pro Annual'           },
  couple_monthly: { priceInPaise: 59_900,  displayName: 'Couple Monthly'       },
  couple_annual:  { priceInPaise: 449_900, displayName: 'Couple Annual'        },
  launch_annual:  { priceInPaise: 99_900,  displayName: 'Launch Annual (Early Bird)' },
  launch_trial:   { priceInPaise: 9_900,   displayName: 'Launch Trial (3 months)'    },
};

export function getPlanPrice(planId: string): PlanPrice | undefined {
  return PLAN_PRICES[planId];
}
