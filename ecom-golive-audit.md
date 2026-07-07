---
name: ecom-golive-audit
description: "ustyld (ecom) go-live audit 2026-07-07 — Day-1 blockers fixed, remaining launch work list"
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

**REMAINING — ops/user-only tasks (no code left):**
1. Create real support email (placeholder support@ustyld.com in all 3 policy pages); set
   NEXT_PUBLIC_SITE_URL; fill NIMBUSPOST_* + ADMIN_MOBILE_NUMBERS in prod env; verify
   NODE_ENV=production on deployed gateway (OTP echoes in responses otherwise!); RabbitMQ up.
2. **E2E smoke test against a live DB (never done):** OTP login → admin role grant → product create →
   studio design → cart → checkout (validation + delivery estimate) → mock payment → stock decrement
   → review submit → report → takedown from /admin/reports → refund from /admin/orders.
3. Read through policy pages before Razorpay KYC submission (sane draft, not legal advice).
4. Integrate Qikink Admin decides which one will goto which currently i am thinking inhouse orders, qikink orders, custom order 3 categories qikink orders can be automated create a new service for printondemand so that we can add multiple print on demand services later.

[[backend-monorepo-status]] [[temptatto-service-design]]
