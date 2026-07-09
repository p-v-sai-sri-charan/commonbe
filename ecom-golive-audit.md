---
name: ecom-golive-audit
description: "inkwear (ex-ustyld) ecom go-live audit — Day-1 blockers fixed, rebrand 2026-07-09, remaining launch work list"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2633174d-efcb-46c9-94a0-72e1d238286b
---

User declared ecom (ustyld, `d:\claude\ecom-frontend` + `ecom-service`) their **actual primary
business** (Temptatto parked). Full go-live audit done 2026-07-07; Day-1 blockers fixed same day.

**Brand is "ustyld" (lowercase)** — was inconsistent (Loomiva on login, uStyld on checkout); unified.
Frontend deployed target: `NEXT_PUBLIC_API_URL=https://api.nexusagents.cloud`.

**Fixed 2026-07-07:**
- `next build` failure (`/login` useSearchParams without Suspense) — wrapped in `<Suspense>`.
- Gateway `/ecom/*` now uses `OptionalJwtAuthGuard` (was hard JwtAuthGuard → logged-out browse 401'd).
  Because of that, ecom-service got a new `RequireUserGuard` (401 'Login required', which the frontend
  interceptor's existing 401→refresh path handles) on cart/orders/creator/ai-credits/ai-generation/
  uploads controllers + designs write routes. Found & fixed real security holes that the hard gateway
  guard had masked: unguarded `PATCH /orders/:id/fulfillment`, `POST /ai-credits/admin/grant`, and all
  product mutations (now AdminGuard).
- Admin role path: `ADMIN_MOBILE_NUMBERS` env (comma-separated) in auth-service — grant-only sync at
  OTP login (`syncAdminRole`); revocation = manual DB edit. Previously roles were always `['user']`.
- Removed fabricated landing content (fake Vogue/Hypebeast press marquee, fake testimonial, fake
  "10k+ creators" stats) → honest capability marquee + manifesto + true facts (25% royalty, 20 free
  AI credits). Fixed CreatorEconomy copy (earnings are payouts, not "credits").
- `twilio` was in package.json but not installed → auth-service build broke; `npm install` fixed.

**⚠ Security: `backend/.env.example` contains a REAL MongoDB Atlas connection string with password
(user chinnu143313) — told user to rotate it; not yet confirmed rotated.**

**Fixed 2026-07-07 (Day 2–3 batch):**
- Checkout fully rebuilt: order summary with exact backend pricing (basePrice + design.price, paise ÷100
  display), login gate (redirect to /login?returnTo=/checkout), empty-cart state, phone/pincode/email
  validation (`lib/india.ts` — all 36 states/UTs, PINCODE_REGEX, INDIAN_MOBILE_REGEX), customerEmail
  captured (new field on ecom Order schema + CreateOrderDto), Razorpay `modal.ondismiss` handled.
- Policy pages live: `/terms`, `/privacy`, `/refund-policy` — linked from both footers + login ToS text.
  **Contact email is a placeholder: support@ustyld.com — user must set up the real address.**
- **Theme system built (user requested light + dark with profile toggle):** `:root` = light warm-cream
  (derived from the inner-page header palette #FAF9F6/#E0D8CE/#C9A84C), `.dark` = original ink/gold.
  next-themes `attribute="class" defaultTheme="dark" enableSystem` in providers.tsx;
  `suppressHydrationWarning` on <html>. `ThemeToggle` (Light/Dark/System) in Account → Appearance.
  This also fixed the white-on-white text bug (body was hardcoded dark + bg-white cards): Header,
  layout Footer, checkout, cart, login, account all converted to semantic tokens (bg-card,
  text-muted-foreground, text-accent-foreground for gold). Landing page intentionally stays
  hardcoded ink/gold in both themes. **Admin pages + products/marketplace/orders/creator pages still
  have hardcoded grays — visual pass pending.**

**Fixed 2026-07-07 (final batch, user hit ~90% weekly limit here):**
- **No-returns policy (user decision):** all products are custom clothing → returns/exchanges are NOT
  accepted, ever, including for size. `/refund-policy` rewritten. I deliberately KEPT free
  replacement/refund for damaged/defective/wrong-item (nothing is sent back, so it's not a "return" —
  and Razorpay/consumer-law effectively require a defect remedy). If user objects, it's the second
  paragraph of the "No returns" section.
- **Stock enforcement:** `createOrder` validates variant+size exists and stock ≥ qty;
  `postPaymentActions` decrements via atomic `$inc` with arrayFilters + `'s.stock': { $gte: qty }`
  floor guard. Decrement happens on payment, not order creation (unpaid orders don't hold stock).
- **NimbusPost ported to ecom-service:** `shipping/nimbus.service.ts` (t-shirt params: 30×25×3cm,
  250g, HSN 6109, 5% tax, invoice prefix USTD-; same NIMBUSPOST_* envs as temptatto, now documented in
  .env.example — empty env = graceful no-op). Order schema: awbNumber/courierId/courierName/
  nimbusShipmentId/labelUrl/estimatedDelivery. `GET /ecom/orders/delivery-estimate?pincode=`
  (registered BEFORE ':id' — route order matters). postPaymentActions sets 'processing' +
  estimatedDelivery (3 production + 5 transit days) + creates shipment. NOTE: Nimbus invoice values
  converted paise→rupees (÷100) — ecom stores prices in paise, temptatto doesn't.
- **SEO:** robots.ts (disallow /admin,/account,/orders,/cart,/checkout,/creator/dashboard), sitemap.ts
  (static + products + marketplace designs, 1h revalidate), rich root metadata (metadataBase, OG,
  twitter, title template). Uses NEXT_PUBLIC_SITE_URL (default https://ustyld.com — set real domain!).
- Checkout shows live delivery estimate once a valid pincode is typed.
- All builds verified green: ecom-service, frontend (23 routes incl. robots.txt/sitemap.xml).

**Fixed 2026-07-07 (continuation session — all code work from the remaining list is DONE):**
- **Reviews + reports ported to ecom-service**: `reviews/` + `reports/` modules (collections
  ecom_reviews/ecom_reports), verified-purchase gate, one-review-per-user-per-design upsert,
  ratingAvg/ratingCount denormalized onto Design; admin endpoints (GET/DELETE /admin/reviews,
  GET/PATCH /admin/reports, POST /admin/designs/:id/takedown|restore). Takedown uses ecom's existing
  'rejected' design status + takedownReason blocks re-publish. RequireUserGuard on write routes.
- **Admin refund**: `POST /ecom/orders/:id/refund` (AdminGuard) → paymentStatus 'refunded' +
  fulfillmentStatus 'cancelled' + stock restored ($inc back) + `nimbusService.cancelShipment(awb)`.
  Guards: only paid orders, not delivered ones. Money movement itself happens in Razorpay dashboard.
- **Frontend**: `components/reviews/*` (StarRating/ReviewDialog/ReportDialog/ReviewsSection),
  new `ui/textarea.tsx` (didn't exist in ecom), rating + reviews + report link on marketplace design
  page, "Write a review" per design item on order detail (paid orders), tracking block on order
  detail (estimatedDelivery/courierName/AWB + NimbusPost link), bg-white→bg-card theming fixes on
  both pages. api.ts: reviews/reports/admin moderation/refundOrder. All builds green.

**Fixed 2026-07-07 (polish + admin moderation session — ALL code work is now DONE):**
- Visual polish: scripted replacement of gray-*/bg-white → semantic tokens across all 16 app pages
  (incl. studio + creator pages), dark: variants added to purple/amber/status-color tints. Both
  themes now render correctly everywhere including admin.
- Admin moderation UI: `/admin/reviews` (list + delete with rating recompute), `/admin/reports`
  (open/resolved/dismissed tabs; takedown-with-reason prompt, dismiss, resolve), refund button on
  `/admin/orders` (paid & not delivered only; confirms, restores stock, cancels shipment) + AWB/
  courier/label-link/customerEmail shown in expanded order rows. Nav links added to admin layout.
- **Atlas password rotated by user (confirmed)**; old credential scrubbed from `.env.example`
  (now localhost placeholders). Note: the old string is still in git history — harmless since rotated.

**Fixed 2026-07-07 (Qikink print-on-demand session):**
- **Qikink POD integrated** (real API, not placeholder — schema extracted from their Postman collection
  via `documenter.gw.postman.com/api/collections/26157218/2sB3QKqpma`). New `printondemand/` module in
  ecom-service: `PodProvider` interface + `PodService` dispatcher (payment/SMS provider-strategy shape,
  more POD providers pluggable later) + `QikinkProvider` (token POST /api/token form-encoded, cached to
  expires_in; order POST /api/order/create; status GET /api/order?id=).
- **Workflow change:** NimbusPost shipment is NO LONGER auto-created on payment. Admin categorizes each
  paid order (`PATCH /ecom/admin/orders/:id/category`, orderType inhouse|custom|print_on_demand):
  inhouse/custom → Nimbus shipment created then; print_on_demand → Qikink order created automatically
  (qikink_shipping=1, gateway=Prepaid, paise→rupees). Uncategorized paid orders show a red badge in
  /admin/orders. POD status sync: `POST /ecom/admin/orders/:id/pod-sync` (pulls status/AWB/tracking_link).
- SKU mapping: `product.pod = { provider:'qikink', printTypeId, baseSku }` + per-variant `podColorCode`;
  provider SKU = `baseSku-colorCode-size`. POD items REQUIRE a design thumbnailUrl (design_code=designId
  so Qikink reuses the design on repeat orders). Admin product form has the pod fields; variant color
  codes via Swagger like variants.
- Refund of a POD order logs a warning — Qikink has NO cancel API; cancel in their dashboard manually.
- Envs (documented in .env.example): QIKINK_CLIENT_ID, QIKINK_CLIENT_SECRET, QIKINK_BASE_URL
  (default sandbox.qikink.com; live api.qikink.com requires requesting access in their dashboard).
- Builds green: ecom-service + frontend.

**Fixed 2026-07-08 (Qikink catalog mapping session):**
- **POD catalog built from Qikink's SKU Descriptions xlsx** (`commonbe/sku_descriptions.xlsx`, 2,794
  SKUs / 154 categories). `scripts/generate_qikink_catalog.py` curates 45 wearable DTG styles
  (AOP + non-garments excluded — studio only does front decals) into
  `ecom-service/printondemand/data/qikink-apparel-catalog.ts`: baseSku, colors (SKU code + garment
  hex I assigned for the 50-color universe), sizes (incl. kids 0_12…13Yrs), Qikink cost price.
- **Admin "enable each style"**: new `/admin/pod-catalog` page (grouped by gender, color swatches,
  cost shown, margin calculator). Enable → prompts retail ₹ (+ optional GLB URL) → creates a fully
  wired Product (pod config, variants with podColorCode, sizes @ placeholder stock 500, tags).
  Disable → isActive false. Re-enable reactivates + reprices. Backend guard rejects retail < cost.
- **Multi-garment 3D**: Product gained `styleKey`, `garmentType`, `model3dUrl`. Studio uses
  product.model3dUrl if set; tshirt-type garments fall back to shirt_baked.glb; other garments
  without a GLB are 2D-only (3D toggle hidden). Drop in new .glb files per style whenever sourced —
  set model3dUrl at enable time or via product PATCH.
- Builds green: ecom-service + frontend (24 routes incl. /admin/pod-catalog).

**Fixed 2026-07-09 (rebrand session — brand is now "inkwear", domain inkwear.org):**
- "ustyld" hit a trademark conflict; user owns **inkwear.org** (note: inkwear.com/.in are taken by
  third parties — user was advised to run tmrsearch.ipindia.gov.in Class 25/35 before launch).
- Full rebrand pass: all 39 frontend refs (metadata/OG, landing, policy pages, checkout Razorpay
  display name, robots/sitemap defaults → https://inkwear.org, support@inkwear.org), backend
  (Nimbus invoice prefix USTD- → INKW-, warehouse defaults), .env.golive (CORS_ORIGINS,
  SMTP_FROM, NEXT_PUBLIC_SITE_URL → inkwear.org). Builds green.
- **Deploy check 2026-07-08 (post user redeploy): backend at api.nexusagents.cloud runs the newest
  code** (products 200 logged-out, pod-catalog route present + guarded). Still failing: CORS has no
  allow-origin (env not set on box), frontend domain not resolving. Frontend must be redeployed with
  the rebranded build + inkwear.org DNS + CORS_ORIGINS, then E2E smoke test.

**REMAINING — ops/user-only tasks (no code left):**
1. Create real support email (placeholder support@inkwear.org in all 3 policy pages); set
   NEXT_PUBLIC_SITE_URL; fill NIMBUSPOST_* + ADMIN_MOBILE_NUMBERS in prod env; verify
   NODE_ENV=production on deployed gateway (OTP echoes in responses otherwise!); RabbitMQ up.
2. **E2E smoke test against a live DB (never done):** OTP login → admin role grant → product create →
   studio design → cart → checkout (validation + delivery estimate) → mock payment → stock decrement
   → admin categorize (inhouse → Nimbus / POD → Qikink sandbox) → review submit → report → takedown
   from /admin/reports → refund from /admin/orders.
3. Read through policy pages before Razorpay KYC submission (sane draft, not legal advice).
4. Qikink ops: fill QIKINK_CLIENT_ID/SECRET (sandbox first), request Live API access in their
   dashboard, set pod.baseSku/printTypeId + variant podColorCodes on POD-eligible products (SKU codes
   from dashboard.qikink.com → Products → SKU Descriptions), test one sandbox order end-to-end.
5. **⚠ Atlas credential is NOT scrubbed** (contrary to the earlier note above): commonbe/.env.example
   lines 13-14 still contain the real mongodb+srv string (user chinnu143313) in HEAD. Rotate-confirmed
   or not, scrub it and commit.

[[backend-monorepo-status]] [[temptatto-service-design]]
