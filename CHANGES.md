# 🚀 New Features Added — Beast Cricket Auction

## Summary of All Changes

### 1. 📦 Organizer Package Plans (Starter / Pro / Elite)

**New model:** `server/models/OrganizerPackage.js`
**New routes:** `server/routes/packages.js`

| Plan | Price | Auctions |
|------|-------|----------|
| 🥉 Starter | ₹499/year | 3 auctions |
| 🥈 Pro | ₹999/year | 10 auctions |
| 🥇 Elite | ₹1,999/year | Unlimited |

- Organizer must buy a package before creating auctions
- Package quota tracked (`auctionsUsed` / `auctionsAllowed`)
- Upgrade carries over unused auctions
- Razorpay-secured (dev mode auto-activates when Razorpay not configured)

**Homepage:** Plans section visible at `/#pricing`
**Dashboard:** "My Package" tab shows status, usage bar, and upgrade buttons

---

### 2. 💳 Player Registration Fee (Organizer-controlled)

**Updated:** `server/models/Auction.js` — `registrationFeeEnabled` + `registrationFee` (already existed, now fully wired)

- Organizer sets fee (in paise) when creating/editing auction
- Toggle: **Free** or **Paid** per auction
- When free → players register instantly with no payment
- When paid → Razorpay payment processed; **money goes to organizer's UPI/bank** (NOT the platform)

---

### 3. 🏦 Organizer Payment Setup (UPI / Bank / GPay)

**New model:** `server/models/OrganizerProfile.js`
**New routes:** `GET/PUT /api/packages/profile`, `GET /api/packages/organizer-payment/:auctionId`

- Organizer adds UPI ID (GPay, PhonePe, Paytm, BHIM), display name, WhatsApp, bank details, QR code
- Players see this info on the registration form when fee is enabled
- UPI ID can be copied with one click
- Bank account number stored encrypted (shown masked: ****1234)

**Dashboard tab:** "Payment Setup" (💳 in sidebar)

---

### 4. 🏠 Homepage Pricing Section

Added a full pricing plans section on homepage (`/#pricing`) showing:
- Package tiers with features list
- Price per year
- Auction count
- "Players fees go to organizer" callout
- "Plans" link in nav + footer

---

### 5. 📸 Photo Visibility (Already Implemented — Verified)

Photos are uploaded via:
- Cloudinary (when configured) → global CDN URL, visible everywhere
- Local `/uploads/` (fallback) → served via `express.static` with CORS headers

The `imgUrl()` helper in `client/lib/api.ts` resolves both. Socket broadcasts `playerRegistered` in real-time, updating all open dashboards instantly.

---

### 6. 🔒 Security Hardening

- **express-mongo-sanitize** — prevents NoSQL injection (add `"express-mongo-sanitize": "^2.2.0"` to server dependencies if not auto-installed)
- **Per-route rate limiting** — `/api/auth` → 20 req/15min, `/api/payment` → 10 req/min
- **Package quota enforcement** — server blocks auction creation when limit reached
- **Payment verification** — Razorpay HMAC signature verified server-side before creating any data
- **Helmet** — already enabled with cross-origin resource policy
- `x-powered-by` disabled

---

## Files Changed

### Server
| File | Change |
|------|--------|
| `server/models/OrganizerPackage.js` | **NEW** — Package subscription model |
| `server/models/OrganizerProfile.js` | **NEW** — Organizer UPI/bank profile |
| `server/routes/packages.js` | **NEW** — Package purchase + profile endpoints |
| `server/routes/payment.js` | Updated `verify-and-create-auction` — checks package quota, handles `registrationFeeEnabled` |
| `server/routes/auctions.js` | Updated `public-register` — blocks when fee required |
| `server/server.js` | Registers `/api/packages`, adds mongo sanitize + per-route rate limits |
| `server/package.json` | Added `express-mongo-sanitize` |
| `server/.env.example` | Added package price env vars |

### Client
| File | Change |
|------|--------|
| `client/app/page.tsx` | Added `/#pricing` plans section, Plans nav/footer links |
| `client/app/dashboard/organizer/page.tsx` | **Full rewrite** — Package tab, Payment Settings tab, `registrationFeeEnabled` toggle, package quota display |
| `client/app/auctions/[id]/register-player/page.tsx` | Free/paid branching, organizer payment info display |

---

## Setup Steps

### 1. Install new server dependency
```bash
cd server
npm install express-mongo-sanitize
```

### 2. Razorpay (required for packages + player fees)
Add to `server/.env`:
```
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
```
Without these, the system runs in **dev mode** — packages activate instantly for free (good for testing).

### 3. Cloudinary (recommended for photo CDN)
```
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```
Without Cloudinary, photos are stored locally in `/server/uploads/` — works fine but not CDN-distributed.

### 4. Flow for Organizer
1. Register / login → select "Organizer" role
2. Go to **Dashboard → My Package** → buy a plan (Starter/Pro/Elite)
3. Go to **Payment Setup** → add UPI ID / bank details
4. Go to **Create Auction** → set player registration fee (or leave free)
5. Share the **Player Registration Form** link with players
6. Players fill the form → pay the fee → money goes to organizer's UPI
7. Player appears in organizer's **Players** tab in real-time

