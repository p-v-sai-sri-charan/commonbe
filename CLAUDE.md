# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Setup
```
npm install
cp .env.example .env        # fill in secrets/credentials
docker compose up -d        # MongoDB + RabbitMQ for local dev
```

### Build
```
nest build <app>             # e.g. nest build auth-service
npm run build                # builds the default project (api-gateway) only
```
Valid `<app>` names: `api-gateway`, `auth-service`, `user-service`, `notification-service`, `payment-service`, `epidiet-service`, `ecom-service`.
`ai` (`libs/ai`) is a shared library, not a runnable app — it's pulled in automatically when building any app that imports `@app/ai`.

### Run (dev, watch mode)
```
npm run start:dev -- <app>   # the -- is required, otherwise npm swallows the arg
```
Dedicated shortcuts exist for only 3 of 6 apps: `npm run start:gateway:dev`, `npm run start:auth:dev`, `npm run start:user:dev`. notification-service/payment-service/epidiet-service don't have shortcuts yet — use the `--` form above.

### Lint / format
```
npm run lint
npm run format
```

### Tests
No test suite exists yet (no Jest config or `*.spec.ts` files in this repo). If adding tests, follow Nest's standard per-app `*.spec.ts` convention.

## Architecture

This is a **Nest CLI monorepo** (not npm/yarn workspaces) — one root `package.json`/`node_modules`, with `nest-cli.json` declaring each app/lib as a "project". Adding a new app means adding a `projects.<name>` entry there plus an `apps/<name>/tsconfig.app.json` (see any existing app for the pattern).

### Services, ports, and databases
Every service owns exactly one MongoDB database — no cross-service DB access, ever. Cross-service reads go through HTTP.

| Service | Port | Mongo DB | Notes |
|---|---|---|---|
| api-gateway | 3000 | — | public entry point, no DB of its own |
| auth-service | 3001 | `auth_db` | OTP + Google auth, sessions/refresh tokens |
| user-service | 3002 | `user_db` | profiles, referral codes, AI token quota |
| payment-service | 3004 | `payment_db` | Razorpay/PayU/PhonePe/GPay |
| notification-service | — | `notification_db` | pure RabbitMQ consumer, no HTTP port |
| epidiet-service | 3005 | `epidiet_db` | epigenetics diet app |
| ecom-service | 3006 | `ecom_db` | T-shirt e-commerce (ThreadAI) |

### Gateway pattern (apps/api-gateway)
The gateway is the only service that validates JWTs (`JwtAuthGuard`, `apps/api-gateway/src/auth/jwt-auth.guard.ts`) and the only one that should ever construct one (it doesn't — auth-service signs tokens; the gateway only verifies). On every protected route it forwards the authenticated user id downstream via an `x-user-id` header; backing services trust that header and have zero JWT-handling code of their own.

Two proxying styles exist:
- **1:1 proxy controllers** (`auth/auth.controller.ts`, `users/users.controller.ts`, `payments/payments.controller.ts`) — one gateway method per backend route, request bodies typed as `unknown` (validation happens at the backing service).
- **Generic wildcard proxy** (`epidiet/epidiet.controller.ts`) — forwards any method/path under `/epidiet/*` as-is. Used because epidiet-service has ~9 sub-resources; mirroring each route individually wasn't worth the drift risk. Prefer this style for future services with many endpoints.

Exact request/response schemas for proxied routes live in the **backing service's own Swagger** (`<service>_URL/docs`), not the gateway's.

### Auth design (apps/auth-service)
- Primary login is mobile + OTP; Google is secondary and **links** to the same `AuthUser` record (by `googleId`, falling back to matching on `email`) rather than creating a duplicate user — see `auth.service.ts`.
- Indian mobile numbers are normalized to E.164 (`+91XXXXXXXXXX`) before any OTP operation.
- OTPs (`schemas/otp.schema.ts`) are stored as an HMAC-SHA256 hash (never plaintext), expire in `OTP_EXPIRES_IN_MINUTES`, are single-use, and track attempts against `OTP_MAX_ATTEMPTS`. The OTP value itself is only echoed back in the API response when `NODE_ENV !== 'production'`.
- SMS sending is a provider-strategy (`services/sms-providers/`): `SmsService` dispatches to whichever provider matches `SMS_PROVIDER` (`console|msg91|twilio|aws_sns|firebase`). `console` logs the OTP (dev default); **`twilio` is fully implemented** (real SDK call via `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`); msg91/aws_sns/firebase remain documented placeholders with the real integration points marked `TODO`. Follow this same provider-strategy shape (interface + one class per provider + env-driven dispatcher) for `payment-service`'s providers and any future swappable integration.
- Refresh tokens rotate on every use (`services/session.service.ts`): each login creates a `Session` with a `sessionFamilyId`; `POST /auth/refresh` revokes the old token and issues a new one in the same family, so a replayed/stolen old token is detectable.
- JWT payload: `{ sub, mobileNumber, email, roles, apps, permissions }` — `roles`/`apps`/`permissions` exist for future authorization checks but aren't enforced anywhere yet.
- auth-service publishes `user.created`/`user.login` events to RabbitMQ (`services/auth-events.service.ts`) as fire-and-forget — publish failures are logged, never thrown, so a broker outage can't break login. notification-service is the only current consumer (`apps/notification-service/src/notifications/notifications.controller.ts`, using `@EventPattern`); it has no HTTP listener at all, just a RabbitMQ microservice (`main.ts` uses `createMicroservice`, not `create`).

### Shared AI provider toggle (libs/ai, `@app/ai`)
A provider-strategy module switched by the `AI_PROVIDER` env var (`claude|openai`), with real SDK calls (`@anthropic-ai/sdk`, `openai`) — not placeholders. `AiService.generateReply(messages)` is the only entry point consumers need. Currently used by epidiet-service's AI coach (`apps/epidiet-service/src/coach/`); intended to be reused as-is by ecom-service. This is the template for any future shared cross-service code: put it in `libs/<name>`, add a `projects.<name>` entry (`type: "library"`) to `nest-cli.json`, and add the path alias to `tsconfig.json`'s `compilerOptions.paths`.

### payment-service provider strategy
Same shape as the SMS providers: `payments/providers/payment-provider.interface.ts` defines the contract, one class per gateway (Razorpay/PayU/PhonePe/GPay), each independently toggled via `PAYMENT_<PROVIDER>_ENABLED`. All four are placeholders with real integration points marked `TODO` (Razorpay HMAC verification, PayU SHA512 hash, PhonePe checksum, UPI intent string) — none will work against a real gateway without that logic being filled in.

### AI token quota (cross-service)
`user-service` owns `aiTokenLimit` on the user profile. It's deliberately **not** settable via the public `POST /users/profile` endpoint — only `users.service.ts`'s `consumeAiTokens()` can decrement it, via an internal-only endpoint (`POST /users/internal/ai-tokens/consume`) that is **not** proxied through the gateway. Any AI-token-consuming feature (epidiet-service's coach today) calls this directly, service-to-service, the same way the gateway calls backing services.

### ecom-service module map
T-shirt e-commerce service at port 3006, database `ecom_db`. Gateway proxies all `/ecom/*` wildcard (same pattern as epidiet).

**Modules:**
- `products` — catalog with variants (`color`, `hexCode`, `podColorCode`, sizes/stock). `designAreaType`: `'full'` (whole shirt) or `'limited'` (bounding box in `designArea: { x, y, width, height }` as percentages). Flags: `showInShop` (false = studio-only blank canvas), `customizable` (false = ready-made mockup product, not editable in studio). Admin-managed.
- `categories` — admin-managed `{ name, slug }` list (e.g. T-Shirt, Hoodie, Jewelry, Jeans) that populates the Category dropdown in `/admin/products`' create form. `GET /ecom/categories` is public; create/delete/`seed-qikink` (bulk-adds Qikink's distinct garmentTypes) are `AdminGuard`-only. Distinct from `Product.garmentType` (drives POD/3D behavior) — a category is just the shop-facing label stored in `Product.category`, no FK.
- `designs` — user canvas saved as `layers[]`: `{ id, type, src, x, y, width, height, rotation, zIndex }`. CRUD + publish to marketplace.
- `marketplace` — published designs browsable by anyone; includes creator commission metadata.
- `creator` — creator profile, payout requests. BYOK OpenAI key stored AES-256-CBC encrypted (`BYOK_ENCRYPTION_KEY` env). Endpoint: `POST /ecom/creator/byok`.
- `ai-credits` — credits separate from epidiet's `aiTokenLimit`. 20 free on signup (via RabbitMQ `user.created` event). +20 on each design purchase. Deducted on each DALL-E call.
- `ai-generation` — DALL-E image generation. Uses system key or BYOK (creator's own key). Results uploaded directly to Cloudinary from backend.
- `cart` — upsert-style; one cart document per user.
- `orders` — create Razorpay order → verify HMAC → distribute commission to creator → award +20 AI credits to buyer. After payment, orders await **admin categorization** (`PATCH /ecom/admin/orders/:id/category`, `orderType: inhouse | custom | print_on_demand`): inhouse/custom creates a NimbusPost shipment, print_on_demand auto-creates a Qikink order (no shipment is created at payment time — categorization is the fulfillment trigger).
- `shipping` — `NimbusService`: NimbusPost B2B shipments for inhouse/custom orders (graceful no-op when `NIMBUSPOST_*` env unset).
- `printondemand` — provider-strategy POD module (`PodProvider` interface + `PodService` dispatcher; same shape as payment/SMS providers). First provider: **Qikink** (`providers/qikink.provider.ts`) — token via `POST /api/token` (form-encoded ClientId/client_secret, cached until `expires_in`), order via `POST /api/order/create`, status via `GET /api/order?id=`. Provider SKU is built as `product.pod.baseSku + '-' + variant.podColorCode + '-' + size`; every POD item needs a design with `thumbnailUrl` (used as design_link + mockup_link, `design_code` = designId). Prices converted paise→rupees. Envs: `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET`, `QIKINK_BASE_URL` (default sandbox). Admin refreshes provider status via `POST /ecom/admin/orders/:id/pod-sync`. Qikink has **no cancel API** — refunding a POD order logs a warning to cancel it in their dashboard.
  - **POD catalog**: `data/qikink-apparel-catalog.ts` — 45 curated wearable styles auto-generated from Qikink's SKU Descriptions xlsx by `scripts/generate_qikink_catalog.py` (AOP + non-garments excluded; each style: baseSku, colors with SKU code + garment hex, sizes, Qikink cost price). `PodCatalogService.enable(styleKey, { basePrice })` creates a fully wired Product (pod config, variants with `podColorCode`, sizes at placeholder stock 500, `styleKey`, `garmentType`, optional `model3dUrl` for the studio's 3D preview); disable = `isActive: false`. Admin routes: `GET /ecom/admin/pod-catalog`, `POST /ecom/admin/pod-catalog/:styleKey/enable|disable`. Rejects retail prices below true Qikink cost. **Pricing model**: Qikink bills per placement — `pod.frontPrintRupees`/`backPrintRupees` (admin-entered, defaults DTG ₹127 / DTF ₹233 per side from their dashboard) + blank price, ×1.05 GST on the sum; customer shipping is free (absorbed in margin). Suggested retail = (blank + front print) × 1.05 × 1.6. Designs with a back print add `pod.backSurchargePaise` (= backPrint × 1.05 × 1.6) to the unit price at order creation (creator commission excludes the surcharge); cart/checkout mirror this client-side.
- `reviews` / `reports` — verified-purchase reviews (rating denormalized onto Design) + design reports with admin moderation/takedown.
- `admin` — singleton `AdminConfig` document (commission rate, feature flags). `AdminGuard` checks `x-user-roles` header (injected by gateway from JWT).
- `uploads` — returns a Cloudinary signed upload URL; frontend uploads directly to Cloudinary CDN.
- `events` — RabbitMQ consumer: `user.created` → init AI credit ledger for new user.

**Cloudinary envs:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### epidiet-service module map
Nine feature modules under `apps/epidiet-service/src/`, each fairly small and following the same schema+dto+service+controller+module shape as the other services:
`profile` → `quiz` (static question catalog in `quiz/data/`, answers in Mongo, `dependsOn` conditional questions, review-panel grouping) → `assessment` (computes pathway scores from quiz answers, snapshots for trend) → `foods` (seeded catalog, tag-based search) → `meal-plans` (rule-based food selection by weakest pathway + optional AI rationale) → `progress` → `education` (seeded articles) → `baby-plan` (static protocol data per gender choice) → `coach` (the AI chat, ties together profile + baby-plan + `@app/ai` + the cross-service token quota).
Scoring and meal-plan generation are deterministic/rule-based (tag matching), not ML — AI is only used to generate human-readable rationale text on top, and that's skipped gracefully if no AI key is configured.

### Swagger
Every HTTP app (all except notification-service, which has no HTTP routes) exposes Swagger at `/docs`, generated via the `@nestjs/swagger` CLI plugin (`compilerOptions.plugins` in `nest-cli.json`) — this auto-infers `@ApiProperty` schemas from the existing `class-validator` DTOs, so DTOs don't need manual Swagger decorators. Controllers only need `@ApiTags`/`@ApiBearerAuth`/`@ApiHeader` for grouping and auth/header documentation.

### Validation
Global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) is set up identically in every app's `main.ts`. New DTOs just need `class-validator` decorators — no per-app wiring required.

### Docker
One generic `Dockerfile` at the repo root, parametrized by `--build-arg APP_NAME=<app>` (multi-stage: `npm ci` + `nest build $APP_NAME`, then a slim runtime stage running `node dist/apps/$APP_NAME/main`). `docker-compose.yml` builds each service from that same Dockerfile with a different `APP_NAME`, and overrides only the host-dependent env vars (Mongo URIs, `*_SERVICE_URL`, `RABBITMQ_URL`) to use container service names instead of `localhost`, while still loading shared secrets from `.env` via `env_file`. This setup has not been tested against a live Docker daemon in this environment — verify before relying on it in production.

### Adding a new service — checklist
1. `apps/<name>/tsconfig.app.json` (copy an existing one, update `outDir`)
2. `apps/<name>/src/main.ts` + `app.module.ts` (copy an existing service's shape: `ConfigModule.forRoot`, `MongooseModule.forRootAsync`, global `ValidationPipe`, Swagger setup)
3. Add `projects.<name>` to `nest-cli.json`
4. Add its env vars to `.env.example` (`<NAME>_SERVICE_PORT`, `<NAME>_SERVICE_URL`, `<NAME>_MONGO_URI`)
5. Add a service block to `docker-compose.yml` (env overrides for Mongo URI / any `*_SERVICE_URL` it calls)
6. If it needs public exposure, add a proxy controller in `apps/api-gateway/src` (1:1 or wildcard, per the gateway pattern above) and register it in the gateway's `app.module.ts`
