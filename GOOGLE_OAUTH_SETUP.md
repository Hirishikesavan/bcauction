# 🔐 Google OAuth Setup Guide

## The Core Concept (Why It Fails)

Google OAuth has **two separate URLs**:

| URL | Purpose | Where to set it |
|-----|---------|-----------------|
| **Redirect URI** (for Google Console) | Where Google sends the auth code after user approves | Google Cloud Console |
| **callbackURL** (in your code) | Where Better Auth redirects the **user's browser** after it handles the code | `signIn.social({ callbackURL: ... })` |

The **Redirect URI** goes to your **BACKEND** (Better Auth handles it).
The **callbackURL** goes to your **FRONTEND** (`/auth/callback` page).

---

## Step 1: Google Cloud Console Setup

Go to → https://console.cloud.google.com/apis/credentials

Click your OAuth 2.0 Client ID → **Edit**

### Authorised JavaScript Origins
Add ALL of these:
```
http://localhost:3000
http://localhost:5000
https://YOUR-FRONTEND.railway.app
https://YOUR-BACKEND.railway.app
```

### Authorised Redirect URIs (THE CRITICAL PART)
Add ALL of these — **BACKEND URLs only**:
```
http://localhost:5000/api/auth/callback/google
https://YOUR-BACKEND.railway.app/api/auth/callback/google
```

❌ **WRONG** (causes Error 400 redirect_uri_mismatch):
```
http://localhost:3000/auth/callback          ← This is frontend, NOT for Google
http://localhost:3000/auth/google/callback   ← Wrong path
```

✅ **CORRECT**:
```
http://localhost:5000/api/auth/callback/google   ← Backend, exact path Better Auth uses
```

---

## Step 2: Local Development (.env files)

### server/.env
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=your-32-char-secret-here-minimum
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAIL=your-admin-email@example.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
```

### client/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
BETTER_AUTH_SECRET=your-32-char-secret-here-minimum
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **BETTER_AUTH_SECRET must be identical on both server and client**

---

## Step 3: Railway Production Setup

### Backend service → Variables
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=your-32-char-secret-here-minimum
BACKEND_URL=https://YOUR-BACKEND.railway.app
FRONTEND_URL=https://YOUR-FRONTEND.railway.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAIL=your-admin-email@example.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
```

### Frontend service → Variables
```
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://YOUR-BACKEND.railway.app
BETTER_AUTH_SECRET=your-32-char-secret-here-minimum
NEXT_PUBLIC_APP_URL=https://YOUR-FRONTEND.railway.app
```

After adding Railway variables, also add to Google Cloud Console Redirect URIs:
```
https://YOUR-BACKEND.railway.app/api/auth/callback/google
```

---

## Step 4: Generate BETTER_AUTH_SECRET

Run this once and use the output in both .env files:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 5: Start Both Servers

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev   # starts on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev   # starts on http://localhost:3000
```

---

## How the Full Google OAuth Flow Works

```
User clicks "Sign in with Google"
        ↓
authClient.signIn.social({ provider:'google', callbackURL:'/auth/callback' })
        ↓
Better Auth redirects browser to:
  → Google consent screen
        ↓
User approves → Google redirects to:
  → http://localhost:5000/api/auth/callback/google   (BACKEND handles this)
        ↓
Better Auth exchanges code → creates session → sets cookie
        ↓
Better Auth redirects browser to:
  → http://localhost:3000/auth/callback   (FRONTEND callbackURL)
        ↓
/auth/callback page reads session → checks role → redirects to dashboard
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Error 400: redirect_uri_mismatch` | Google Console missing `http://localhost:5000/api/auth/callback/google` | Add backend redirect URI to Google Console |
| `NetworkError when fetching` | `NEXT_PUBLIC_API_URL` not set or wrong | Set in `client/.env.local` |
| `Login failed. Redirecting...` | Session not found after OAuth | Check `BETTER_AUTH_SECRET` matches on both server & client |
| Login redirects back to login | `getSession()` returns null | Check CORS `credentials:include` and cookie `sameSite` setting |
| Google button not working on Railway | Missing production redirect URI in Google Console | Add `https://YOUR-BACKEND.railway.app/api/auth/callback/google` |

