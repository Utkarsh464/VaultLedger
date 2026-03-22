# VaultLedger — Hosting & Client Delivery Guide

---

## PART 1 — HOSTING SETUP (Do this yourself before delivery)

### Step 1 — MongoDB Atlas (Database)

1. Go to https://mongodb.com/atlas → Sign up free
2. Create a free **M0 cluster** → choose any region
3. **Database Access** → Add new database user:
   - Username: `vaultledger`
   - Password: generate a strong one (save it)
   - Role: `Atlas admin`
4. **Network Access** → Add IP address → **Allow access from anywhere** (`0.0.0.0/0`)
5. **Connect** → Drivers → Copy the connection string:
   ```
   mongodb+srv://vaultledger:<password>@cluster0.xxxxx.mongodb.net/
   ```
6. Replace `<password>` with your actual password and append the DB name:
   ```
   mongodb+srv://vaultledger:yourpassword@cluster0.xxxxx.mongodb.net/vault_ledger?retryWrites=true&w=majority
   ```
   **Save this — it's your MONGODB_URI**

---

### Step 2 — Deploy Backend on Render

1. Push your project to GitHub (make sure `.env` is in `.gitignore`)
2. Go to https://render.com → Sign up → **New** → **Web Service**
3. Connect GitHub → select your repo
4. Configure:

   | Setting        | Value              |
   |----------------|--------------------|
   | Root Directory | `backend`          |
   | Runtime        | `Node`             |
   | Build Command  | `npm install`      |
   | Start Command  | `npm start`        |
   | Plan           | Free               |

5. Add **Environment Variables**:

   | Key              | Value                                           |
   |------------------|-------------------------------------------------|
   | `NODE_ENV`       | `production`                                    |
   | `MONGODB_URI`    | your Atlas URI from Step 1                      |
   | `JWT_SECRET`     | run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and paste output |
   | `JWT_EXPIRES_IN` | `7d`                                            |
   | `ALLOWED_ORIGINS`| `https://your-app.vercel.app` (fill after Step 3) |
   | `GOOGLE_CLIENT_ID` | your Google Client ID (optional, Step 5)      |

6. Click **Deploy** → wait ~3 min
7. Copy your backend URL: `https://vault-ledger-api.onrender.com`
8. Test it: open `https://vault-ledger-api.onrender.com/api/health` in browser
   → Should show `{"status":"ok","database":"connected"}`

---

### Step 3 — Deploy Frontend on Vercel

1. Go to https://vercel.com → Sign up → **Add New Project**
2. Import your GitHub repo
3. Configure:

   | Setting          | Value           |
   |------------------|-----------------|
   | Root Directory   | `frontend`      |
   | Framework Preset | `Vite`          |
   | Build Command    | `npm run build` |
   | Output Directory | `dist`          |

4. Add **Environment Variables**:

   | Key                   | Value                                     |
   |-----------------------|-------------------------------------------|
   | `VITE_API_URL`        | `https://vault-ledger-api.onrender.com`   |
   | `VITE_GOOGLE_CLIENT_ID` | your Google Client ID (optional)        |

5. Click **Deploy** → wait ~2 min
6. Copy your frontend URL: `https://your-app.vercel.app`

---

### Step 4 — Connect Frontend to Backend (CORS)

1. Go back to **Render** → your service → **Environment**
2. Update `ALLOWED_ORIGINS`:
   ```
   https://your-app.vercel.app
   ```
3. Render will auto-redeploy in ~1 minute

---

### Step 5 — Seed the Database with Client Credentials

In **Render dashboard** → your backend service → **Shell** tab:

```bash
SEED_EMAIL="client@email.com" SEED_PASSWORD="StrongPass@123" SEED_NAME="Rajesh Sharma" node utils/seed.js
```

Replace with the actual client name, email, and a strong temporary password.

You'll see:
```
✅ Admin created
✅ 6 sample loans created
✅ 31 payment records created
```

---

### Step 6 — Set Up Google Login (Optional but recommended)

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   http://localhost:5173
   ```
6. Add **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app
   ```
7. Click **Create** → copy the **Client ID**
8. Add to Render env vars: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
9. Add to Vercel env vars: `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
10. Redeploy both services
11. In **Render Shell**, add client's Gmail to the admin account:
    ```bash
    node -e "
    import('./models/User.js').then(async ({default: User}) => {
      await User.updateOne({}, { email: 'client@gmail.com' });
      console.log('Updated');
      process.exit(0);
    });
    "
    ```
    Or just tell the client to use email/password login and update their email via Settings.

---

### Step 7 — Keep Render Alive (Free Tier)

Render free tier sleeps after 15 minutes of inactivity. To prevent this:

1. Go to https://uptimerobot.com → Sign up free
2. **Add New Monitor**:
   - Monitor Type: `HTTP(s)`
   - URL: `https://vault-ledger-api.onrender.com/api/health`
   - Monitoring Interval: `Every 5 minutes`
3. Done — backend stays warm 24/7

---

## PART 2 — CLIENT DELIVERY

### What to send the client

Prepare a clean handover document (copy-paste and edit):

---

**Subject: VaultLedger — Your Dashboard is Live 🎉**

Hi [Client Name],

Your loan management dashboard is ready. Here are your access details:

**Dashboard URL:** https://your-app.vercel.app

**Login Credentials:**
- Email: client@email.com
- Password: StrongPass@123

**First steps after login:**
1. Go to **Settings** (sidebar) → change your password immediately
2. Delete the sample loan data (or keep it as reference)
3. Start adding your real borrowers via **New Loan**

**What the system can do:**
- Track loans with Simple or Compound interest — calculates automatically
- Live interest counter that updates every second
- Record payments and track recovery progress
- EMI calculation and schedule
- Pause interest during grace periods
- Send WhatsApp / Email reminders to borrowers
- Export PDF statements per borrower
- Full mobile support — works on your phone browser

**WhatsApp Reminders Setup:**
To send WhatsApp reminders to borrowers, each borrower needs to:
1. Send this message to +34 644 59 78 42 on WhatsApp:
   `I allow callmebot to send me messages`
2. They'll receive an API key — you enter it in the Send Reminder screen

**Support:**
If you face any issues, contact me at [your email/phone].

---

### Final checklist before sending

- [ ] Backend health check passes: `/api/health` → `{"status":"ok","database":"connected"}`
- [ ] Can log in with client credentials
- [ ] Dashboard loads with sample data
- [ ] Can create a new loan
- [ ] Can record a payment
- [ ] PDF export works
- [ ] Mobile layout tested on phone
- [ ] Uptime monitor set up (UptimeRobot)
- [ ] Demo credentials removed from login page ✅
- [ ] Client password is strong (not Admin@123)
- [ ] Told client to change password on first login

---

## PART 3 — COMMON ERRORS & FIXES

### ❌ "Cannot connect to server" on login
1. Visit `https://your-api.onrender.com/api/health`
2. If it loads → CORS issue. Check `ALLOWED_ORIGINS` matches Vercel URL exactly
3. If it doesn't load → Render service crashed. Check Render logs

### ❌ "MongoDB connection failed" in Render logs
1. Check `MONGODB_URI` in Render env vars — no typos
2. Atlas → Network Access → confirm `0.0.0.0/0` is listed
3. Atlas → Database Access → confirm user password is correct

### ❌ Render sleeping (cold start)
- First request after sleep takes ~30s — set up UptimeRobot (Step 7)

### ❌ Vercel 404 on page refresh
- `vercel.json` must be present in `frontend/` folder with the rewrites config

### ❌ Google login: "Origin not authorized"
- Add your Vercel URL to Google Console → Authorized JavaScript origins

### ❌ "This Google account is not authorized"
- The client's Gmail must match the email in the database
- Update via Settings → Email, or update directly in MongoDB Atlas

### ❌ Token expired after password change
- Expected behavior — client must log in again with new password

---

## PART 4 — ENVIRONMENT VARIABLES REFERENCE

### Backend (Render)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64-char-random-hex>
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://your-app.vercel.app
GOOGLE_CLIENT_ID=<optional>
PORT=<set automatically by Render>
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-api.onrender.com
VITE_GOOGLE_CLIENT_ID=<optional, same as backend>
```

---

## PART 5 — UPDATING THE APP AFTER DELIVERY

To push updates:

```bash
git add .
git commit -m "fix: description of what you changed"
git push origin main
```

- Render auto-deploys backend on push
- Vercel auto-deploys frontend on push
- No downtime for the client

---

Built with VaultLedger — Production Ready
