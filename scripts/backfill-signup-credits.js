/**
 * One-off backfill: grants the signup AI-credit bonus to every existing user
 * who never received it.
 *
 * Why this is needed: until 2026-07-14, auth-service only published
 * `user.created` to auth_events_queue (notification-service's queue).
 * ecom-service listened on a separate ecom_events_queue that nothing
 * published to, so its signup-credit grant never fired for ANY user, ever
 * (see commit "fix(events): signup AI credits never granted"). New signups
 * are fixed going forward — this script catches up everyone who signed up
 * before the fix.
 *
 * Usage (run from the commonbe root, wherever AUTH_MONGO_URI/ECOM_MONGO_URI
 * in your environment point at the real databases — e.g. on the VPS with
 * the same .env docker-compose uses):
 *
 *   node scripts/backfill-signup-credits.js            # dry run (default)
 *   node scripts/backfill-signup-credits.js --apply     # actually grants credits
 *   node scripts/backfill-signup-credits.js --apply --amount=20
 */
const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const amountArg = process.argv.find((a) => a.startsWith('--amount='));
const AMOUNT = amountArg ? Number(amountArg.split('=')[1]) : 20;

const AUTH_MONGO_URI = process.env.AUTH_MONGO_URI || 'mongodb://localhost:27017/auth_db';
const ECOM_MONGO_URI = process.env.ECOM_MONGO_URI || 'mongodb://localhost:27017/ecom_db';

async function main() {
  if (!AMOUNT || AMOUNT < 1) {
    console.error(`Invalid --amount (${AMOUNT}) — must be a positive number.`);
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes — pass --apply to commit)'}`);
  console.log(`Signup bonus amount: ${AMOUNT} credits\n`);

  const authConn = await mongoose.createConnection(AUTH_MONGO_URI).asPromise();
  const ecomConn = await mongoose.createConnection(ECOM_MONGO_URI).asPromise();

  try {
    const authUsers = authConn.collection('auth_users');
    const creditTxns = ecomConn.collection('ecom_ai_credit_transactions');
    const credits = ecomConn.collection('ecom_ai_credits');

    const users = await authUsers.find({}, { projection: { _id: 1, mobileNumber: 1 } }).toArray();
    console.log(`Found ${users.length} auth users.\n`);

    let granted = 0;
    let skipped = 0;

    for (const user of users) {
      const userId = user._id.toString();
      const alreadyGranted = await creditTxns.findOne({ userId, reason: 'signup_bonus' });
      if (alreadyGranted) {
        skipped += 1;
        continue;
      }

      console.log(`${APPLY ? 'Granting' : 'Would grant'} ${AMOUNT} credits -> ${userId} (${user.mobileNumber ?? 'no mobile'})`);

      if (APPLY) {
        await credits.updateOne(
          { userId },
          { $inc: { balance: AMOUNT, lifetimeEarned: AMOUNT }, $setOnInsert: { userId, lifetimeUsed: 0 } },
          { upsert: true },
        );
        await creditTxns.insertOne({
          userId,
          amount: AMOUNT,
          reason: 'signup_bonus',
          referenceId: 'backfill-2026-07-14',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      granted += 1;
    }

    console.log(`\n${APPLY ? 'Granted' : 'Would grant'} credits to ${granted} user(s). Skipped ${skipped} (already had a signup_bonus transaction).`);
    if (!APPLY && granted > 0) {
      console.log('\nThis was a dry run — re-run with --apply to actually write the credits.');
    }
  } finally {
    await authConn.close();
    await ecomConn.close();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
