# inkwear UAT Checklist

_Last updated: 2026-07-10. Companion to `ecom-golive-audit.md` (full history)._

---

## 🔴 PRE-UAT — do these before testing starts

### Deploy (everything below is local-only until you do)
- [ ] **Redeploy backend** — all services changed: ecom-service (POD pricing, back print,
      commission fix, payouts, webhook) + api-gateway (webhook header forward) + auth-service
      (new OTP SMS text). `docker compose up -d --build`
- [ ] **Redeploy frontend** with `NEXT_PUBLIC_API_URL=https://api.nexusagents.cloud` and
      `NEXT_PUBLIC_SITE_URL=https://inkwear.org` in the build env (Next bakes these at build time).

### One-time config on the live box
- [ ] `/admin/config`: set **Cash payout rate = 100** and **Store-credit payout rate = 120**
      (live DB still has 400/4000 — at those values a ₹100 payout pays ₹400 cash!)
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` to the server `.env`, then in the **Razorpay dashboard**:
      Webhooks → URL `https://api.nexusagents.cloud/ecom/webhooks/razorpay`,
      events `payment.captured` + `payment.failed`, same secret. Restart ecom-service.
- [ ] ⚠ **Qikink env points at LIVE** (`api.qikink.com`) — categorizing a UAT order as
      print_on_demand creates a REAL Qikink order and charges your wallet. Either switch
      `QIKINK_BASE_URL` to `https://sandbox.qikink.com` (+ sandbox secret) for UAT, or
      deliberately run ONE small real order as the ultimate end-to-end test.
- [ ] `NODE_ENV=development` is OK **for UAT only** (OTP visible in API responses = easy testing).

### Content setup (via /admin)
- [ ] POD Catalog → enable 1–2 t-shirt styles (DTG vs DTF: check the print-cost prefills match
      the Qikink dashboard for that garment; UC48 reference: DTG ₹127/side, DTF ₹233/side)
- [ ] Upload product photos (Products → Upload photo)
- [ ] Star one product as **Featured** (drives the landing hero grid)
- [ ] Optionally: enable one style with "Show in shop" unchecked → verifies studio-only blanks

---

## ✅ UAT TEST SCRIPT — the flows to exercise

### Customer journey
- [ ] Landing: hero 75% + product peek, featured products render with real photos/prices
- [ ] OTP login — SMS arrives via Twilio with the branded text ("…log in to inkwear…")
- [ ] Studio via "Start with a blank canvas" → garment-type dialog → editor
- [ ] Studio via product page → "Open Design Studio"
- [ ] AI generation (uses OpenAI key + credits), PNG upload, drag/rotate/resize/reorder layers
- [ ] **Front/Back tabs**: design both faces, check the back-print "+₹" hint, 3D shows both decals
- [ ] **Mobile**: repeat studio flow on a phone — canvas fits, color/size rows scroll horizontally
- [ ] Save design → log out → log in → creator dashboard → **Edit (pencil) reopens it with layers**
- [ ] Cart + checkout: prices match everywhere (product page = cart = checkout = Razorpay
      amount); back-print surcharge appears when the design has a back
- [ ] Pay with Razorpay test card → order confirmed → stock decremented
- [ ] **Webhook test**: pay but close the tab BEFORE returning to the site → order should still
      flip to paid within ~1 min (check /admin/orders). This validates the new webhook.
- [ ] Order detail: tracking block, delivery estimate
- [ ] Review a delivered/paid order; report a design; verify admin moderation sees both

### Creator journey
- [ ] Register as creator → profile link works (/creators/slug)
- [ ] Publish design to marketplace with a price → appears in marketplace + landing creators row
- [ ] Second account buys it → commission credited (rate = /admin/config value, NOT 25 hardcoded)
- [ ] Request payout (cash ₹100 min → ₹100; discount → ₹120 credit) → admin approves/rejects
      (reject must refund the balance)

### Admin journey
- [ ] /admin loads directly by URL after login (hydration fix)
- [ ] Config save works (no "_id should not exist" error)
- [ ] Orders: categorize paid order → inhouse (NimbusPost AWB appears) / POD (Qikink order id
      appears; Refresh POD Status pulls status/AWB)
- [ ] Refund flow: stock restored, shipment cancelled, POD warning logged
- [ ] Reviews/reports moderation, payouts approval

---

## 🟡 POST-UAT — before real customers

- [ ] **`NODE_ENV=production`** on the box (kills the OTP echo — verify: login response must NOT
      contain the OTP)
- [ ] **Razorpay LIVE keys** (needs approved KYC; read the policy pages before submitting)
- [ ] **Rotate + scrub the Atlas credential** in `.env.example` (user chinnu143313 — STILL live at
      git HEAD) and rotate the NimbusPost password (also committed)
- [ ] Qikink LIVE access confirmed + `QIKINK_BASE_URL=https://api.qikink.com` + live secret
- [ ] Real `support@inkwear.org` mailbox (referenced in all 3 policy pages)
- [ ] Twilio DLT registration for India SMS routes — register the exact OTP template text
- [ ] Final trademark decision (Indraloom / Kalpavastra cleared; inkwear.com/.in are third-party —
      if the name changes, the rebrand is one scripted pass)
- [ ] Daily categorization habit: paid orders ship NOTHING until categorized in /admin/orders
      (red "uncategorized" badge)

## 🟢 POST-LAUNCH backlog (value order)

1. Order-confirmation email to customers (SMTP scaffolding exists in notification-service)
2. New-paid-order alert for admin (email/Telegram) — avoids polling /admin/orders
3. Sentry (or similar) error monitoring on both apps
4. Nightly MongoDB backup (mongodump cron on the VPS)
5. Real OG/social share image + favicon (metadata is ready, assets are placeholders)
6. GLB models for non-tshirt garments (meshy.ai prompts already provided) + per-garment decal
   position tuning in TshirtViewer
7. Sleeve/pocket print placements in the studio (₹50 each at Qikink; schema slot exists)
8. Marketplace design search/filtering as the catalog grows
9. Creator profile pictures + bio editing UI polish
10. Terms page: make the commission % dynamic (currently static legal text)
