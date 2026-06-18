# Setup & Deployment

Operational guide for running this repo locally and deploying it. For architecture/conventions (how the services fit together, why things are built the way they are), see [CLAUDE.md](CLAUDE.md).

## Prerequisites

- Node.js 20+ and npm
- Docker + Docker Compose — either just for local MongoDB/RabbitMQ, or for a full containerized run (see [Full Docker deployment](#full-docker-deployment))

## 1. Local development setup

```bash
npm install
cp .env.example .env        # then fill in the values described below
docker compose up -d mongodb rabbitmq   # or point *_MONGO_URI / RABBITMQ_URL at your own instances
```

Run each service you need in its own terminal (the `--` is required, or npm swallows the argument):

```bash
npm run start:dev -- api-gateway
npm run start:dev -- auth-service
npm run start:dev -- user-service
npm run start:dev -- payment-service
npm run start:dev -- notification-service
npm run start:dev -- epidiet-service
```

For just the core mobile-OTP login flow you only need `api-gateway`, `auth-service`, and `user-service` running.

## 2. Environment variables by feature

`.env.example` is grouped the same way — copy it in full and fill in what you need; everything else has a safe local-dev default.

| Group | What to set |
|---|---|
| Core / JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Per-service | `*_SERVICE_PORT`, `*_SERVICE_URL`, `*_MONGO_URI` for auth/user/payment/epidiet |
| OTP | `OTP_EXPIRES_IN_MINUTES`, `OTP_MAX_ATTEMPTS`, `OTP_HASH_SECRET` |
| SMS provider | `SMS_PROVIDER` (`console` works with no credentials — OTP is logged, not sent) + provider-specific keys if you switch off `console` |
| Google login | `GOOGLE_CLIENT_ID` |
| Refresh tokens | `REFRESH_TOKEN_EXPIRES_IN_DAYS`, `REFRESH_TOKEN_HASH_SECRET` |
| Rate limiting | `RATE_LIMIT_*` (gateway) |
| RabbitMQ | `RABBITMQ_URL`, `RABBITMQ_EVENTS_QUEUE` |
| Payments | `PAYMENT_<PROVIDER>_ENABLED` flags + that provider's credentials (Razorpay/PayU/PhonePe/GPay) |
| AI toggle | `AI_PROVIDER` (`claude` or `openai`) + `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` |
| user-service | `AI_TOKEN_LIMIT_DEFAULT` |

Everything not set falls back to a local-dev-safe default (see each `*.module.ts`/`main.ts` for the exact fallback).

## 3. Verifying it's running

Each HTTP service exposes Swagger once it's up:

- `http://localhost:3000/docs` — api-gateway
- `http://localhost:3001/docs` — auth-service
- `http://localhost:3002/docs` — user-service
- `http://localhost:3004/docs` — payment-service
- `http://localhost:3005/docs` — epidiet-service

(notification-service has no HTTP port — it's a pure RabbitMQ consumer; check its logs to confirm it connected.)

## 4. Smoke test curl commands

```bash
# Request OTP (creates the user on first call)
curl -X POST http://localhost:3000/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'

# Verify OTP -> returns accessToken + refreshToken
curl -X POST http://localhost:3000/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","otp":"123456"}'

# Refresh an access token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken from verify>"}'

# Create profile (protected — replace TOKEN)
curl -X POST http://localhost:3000/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fullName":"Sai Sricharan","email":"sai@example.com"}'

# Get profile (includes referralCode, aiTokenLimit)
curl http://localhost:3000/users/me -H "Authorization: Bearer TOKEN"

# List enabled payment providers
curl http://localhost:3000/payments/providers -H "Authorization: Bearer TOKEN"
```

## 5. Full Docker deployment

```bash
docker compose up -d --build
```

This builds and starts every service from the single root `Dockerfile` (parametrized per service via `--build-arg APP_NAME=<app>` inside `docker-compose.yml`):

| Service | Host port |
|---|---|
| api-gateway | 3000 |
| auth-service | 3001 |
| user-service | 3002 |
| payment-service | 3004 |
| epidiet-service | 3005 |
| mongodb | 27017 |
| rabbitmq | 5672 (AMQP), 15672 (management UI, guest/guest) |

notification-service has no host port mapping — it only consumes from RabbitMQ internally.

> **Not yet smoke-tested against a live Docker daemon.** The compose file and Dockerfile follow the same patterns already verified outside Docker (`nest build`/`nest start` for every app succeed), but actually running `docker compose up` hasn't been exercised in this environment. Validate it end-to-end before relying on it for a real deployment.

## 6. Before going to production

None of this is enforced by the code — it's on you to change before a real deployment:

- Replace every `*_change_this` placeholder secret: `JWT_SECRET`, `OTP_HASH_SECRET`, `REFRESH_TOKEN_HASH_SECRET`
- Set `NODE_ENV=production` — this disables the OTP value being echoed back in `POST /auth/otp/request`'s response
- Point `*_MONGO_URI` at real managed databases, not the ephemeral `docker-compose` volume
- Change the RabbitMQ `guest`/`guest` credentials
- Fill in real credentials for whichever SMS provider, payment provider(s), and AI provider you're actually using, and set the corresponding `PAYMENT_<PROVIDER>_ENABLED` / `SMS_PROVIDER` / `AI_PROVIDER` flags
- Decide whether to keep Swagger (`/docs`) exposed publicly on each service, or gate/disable it
