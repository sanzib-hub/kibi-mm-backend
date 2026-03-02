# Credential Rotation Checklist

All credentials listed below were found exposed in git history (and some in current HEAD) across KIBI repos. Each must be rotated at its source, then the new value updated in all deployment environments.

**Priority:** CRITICAL — exposed secrets in git history are recoverable by anyone who has ever cloned the repos.

**Status:** Git history cleanup completed (Mar 2, 2026). Secrets stripped from all 3 affected repos and force-pushed.

---

## Pre-generated Replacement Values

Generate new values before rotating. Use cryptographically random strings:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"  # for JWT
python -c "import secrets; print(secrets.token_urlsafe(24))"  # for DB password
python -c "import secrets; print(secrets.token_urlsafe(24))"  # for webhook secret
```

| Secret | Where to Deploy |
|--------|-----------------|
| JWT Secret | All 4 microservices `JWT_SECRET` env var |
| DB Password | PostgreSQL + all 4 microservices `DB_PASSWORD` env var |
| Razorpay Webhook Secret | Razorpay Dashboard + OnBoarding `RAZORPAY_WEBHOOK_SECRET` env var |

> **Save generated values to a password manager. Never commit them to the repo.**

---

## CRITICAL Priority

### 1. AWS Access Key

- **Status:** [ ] Not rotated
- **Exposed key:** (see password manager for old value — already stripped from git history)
- **Found in:** `kibi-backend-rework` → `OnBoarding/.env` (git history)
- **Rotation steps:**
  1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/) → Users → select the user owning the compromised key
  2. Under "Security credentials" → "Access keys", find the compromised key
  3. Click **Deactivate**, verify nothing breaks, then **Delete**
  4. Click **Create access key** → save new Access Key ID and Secret Access Key
  5. Update these environment variables in all deployed environments:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
  6. Update in: Lambda environment variables, any EC2/ECS task definitions, CI/CD secrets (GitHub repo secrets)

### 2. Razorpay API Keys

- **Status:** [ ] Not rotated

Two sets of live keys were exposed:

#### 2a. Backend key
- **Exposed:** Razorpay live key + secret (see password manager — already stripped from git history)
- **Found in:** `kibi-backend-rework` → `OnBoarding/.env` (git history)

#### 2b. Mobile key
- **Exposed:** Razorpay live key (see password manager — already stripped from git history)
- **Found in:** `mobile-app-refactor` → `.env` (git history)

- **Rotation steps:**
  1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) → Settings → API Keys
  2. Click **Regenerate Key** for the live mode key
  3. Save the new Key ID and Key Secret (secret is shown only once)
  4. Update in:
     - Backend: OnBoarding deployment env → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
     - Mobile: deployment env → `RAZORPAY_KEY`
     - Any webhook configurations that reference the old key

### 3. Razorpay Webhook Secret

- **Status:** [ ] Not rotated
- **Exposed:** Old webhook secret (see password manager — already stripped from git history)
- **New value:** Use pre-generated value from password manager
- **Rotation steps:**
  1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) → Settings → Webhooks
  2. Edit the webhook, change the **Secret** to the new pre-generated value
  3. Update in: OnBoarding deployment env → `RAZORPAY_WEBHOOK_SECRET` = new value

### 4. JWT Secret

- **Status:** [ ] Not rotated
- **Exposed:** Old weak JWT secret (see password manager — already stripped from git history)
- **New value:** Use pre-generated value from password manager
- **Rotation steps:**
  1. Update `JWT_SECRET` in **all 4 microservices simultaneously** (to avoid token validation failures):
     - OnBoarding deployment env → `JWT_SECRET` = new value
     - Events deployment env → `JWT_SECRET` = new value
     - Payments deployment env → `JWT_SECRET` = new value
     - BrandCampaign deployment env → `JWT_SECRET` = new value
  2. Restart all 4 services simultaneously
  3. **Warning:** This invalidates all existing user sessions. Users will need to log in again. Deploy during off-peak hours.

### 5. Database Password

- **Status:** [ ] Not rotated
- **Exposed:** Old weak DB password (see password manager — already stripped from git history)
- **New value:** Use pre-generated value from password manager
- **Rotation steps:**
  1. Connect to the PostgreSQL instance as a superuser
  2. Change the password:
     ```sql
     ALTER USER postgres WITH PASSWORD '<new-value-from-password-manager>';
     ```
  3. Update `DB_PASSWORD` in **all 4 microservices simultaneously**:
     - OnBoarding deployment env → `DB_PASSWORD` = new value
     - Events deployment env → `DB_PASSWORD` = new value
     - Payments deployment env → `DB_PASSWORD` = new value
     - BrandCampaign deployment env → `DB_PASSWORD` = new value
  4. Restart all 4 services simultaneously
  5. **Warning:** Schedule during maintenance window. All services must be updated and restarted together or they will lose DB connectivity.

---

## HIGH Priority

### 6. Firebase Service Account Key

- **Status:** [ ] Not rotated
- **Exposed:** Private key for service account in project `kibi-sports-78354`
- **Found in:** `kibi-backend-rework` → `Events/firebase.service.account.json` (git history)
- **Rotation steps:**
  1. Go to [Firebase Console](https://console.firebase.google.com/) → Project `kibi-sports-78354` → Project Settings → Service accounts
  2. Or go to [GCP IAM Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=kibi-sports-78354)
  3. Find the compromised service account, go to **Keys** tab
  4. Delete the existing compromised key
  5. Click **Add Key** → **Create new key** → JSON format
  6. Download the new JSON key file
  7. Update in: Events microservice deployment (Lambda env var or mounted secret)

### 7. Google Cloud API Keys

- **Status:** [ ] Not rotated

Two API keys exposed:

#### 7a. Google Places API Key
- **Exposed:** Places API key (see password manager — already stripped from git history)
- **Found in:** `mobile-app-refactor` → `.env` (git history)

#### 7b. Google Maps API Key
- **Exposed:** Maps API key (see password manager — already stripped from git history)
- **Found in:** `web_admin_fe` → `.env` (git history)

- **Rotation steps:**
  1. Go to [GCP Console → Credentials](https://console.cloud.google.com/apis/credentials)
  2. Find each key by value, click the key name
  3. Click **Regenerate key** (or delete and create new)
  4. **Apply restrictions** on the new keys:
     - Places key: restrict to Android apps (package name `com.kibisportscli` + SHA-1 fingerprint)
     - Maps key: restrict to HTTP referrers (your admin portal domain only)
  5. Update in:
     - Mobile deployment env → `GOOGLE_PLACES_API_KEY` = `<new key from step 3>`
     - Admin FE deployment env → `VITE_GOOGLE_MAPS_API_KEY` = `<new key from step 3>`

---

## MEDIUM Priority

### 8. Gmail App Password

- **Status:** [ ] Not rotated
- **Exposed:** Old Gmail app password (see password manager — already stripped from git history)
- **Found in:** `kibi-backend-rework` → `OnBoarding/.env` (git history)
- **Rotation steps:**
  1. Go to [Google Account Security](https://myaccount.google.com/security)
  2. Under "2-Step Verification" → "App passwords"
  3. Revoke the existing app password
  4. Generate a new app password for "Mail" → "Other (Custom name)" → "KIBI Backend"
  5. Update in: OnBoarding deployment env → `GMAIL_APP_PASSWORD` = `<new 16-char password from step 4>`

### 9. Fast2SMS API Key

- **Status:** [ ] Not rotated
- **Exposed:** Fast2SMS authorization key
- **Found in:** `kibi-backend-rework` → `OnBoarding/.env` (git history)
- **Rotation steps:**
  1. Go to [Fast2SMS Dashboard](https://www.fast2sms.com/dashboard/dev-api)
  2. Click **Regenerate API Key**
  3. Update in: OnBoarding deployment env → `FAST2SMS_API_KEY` = `<new key from step 2>`

### 10. CodePush Deployment Keys

- **Status:** [ ] Not rotated
- **Exposed:** Staging and Production CodePush keys (see password manager — already stripped from git history)
- **Found in:** `mobile-app-refactor` → `android/gradle.properties`
- **Rotation steps:**
  1. Install AppCenter CLI: `npm install -g appcenter-cli`
  2. Login: `appcenter login`
  3. Create new deployments:
     ```bash
     appcenter codepush deployment add -a <owner>/KibiSportsCli NewStaging
     appcenter codepush deployment add -a <owner>/KibiSportsCli NewProduction
     ```
  4. Get the new keys:
     ```bash
     appcenter codepush deployment list -a <owner>/KibiSportsCli --displayKeys
     ```
  5. Update `mobile-app-refactor/android/gradle.properties`:
     ```properties
     CODEPUSH_STAGING_KEY=<new-staging-key>
     CODEPUSH_PRODUCTION_KEY=<new-production-key>
     ```
  6. Commit, push, and build a new APK
  7. Remove old deployments after verifying new ones work

---

## Recommended Rotation Order

To minimize downtime, rotate in this order:

1. **AWS key** (step 1) — independent, no downtime
2. **Firebase key** (step 6) — independent, no downtime
3. **Google API keys** (step 7) — independent, no downtime
4. **Fast2SMS** (step 9) — independent, no downtime
5. **Gmail app password** (step 8) — independent, no downtime
6. **Razorpay keys + webhook** (steps 2, 3) — do together, brief payment downtime
7. **DB password + JWT secret** (steps 4, 5) — do together during maintenance window, invalidates all sessions
8. **CodePush keys** (step 10) — requires new app build + release

---

## Post-Rotation Verification Checklist

- [ ] All services start successfully with new credentials
- [ ] User login/signup flow works (JWT, DB)
- [ ] Payment processing works (Razorpay)
- [ ] File uploads work (AWS S3)
- [ ] Push notifications work (Firebase)
- [ ] SMS OTP delivery works (Fast2SMS)
- [ ] Email sending works (Gmail)
- [ ] Maps/Places autocomplete works (Google API keys)
- [ ] CodePush OTA updates deploy successfully
- [ ] Webhook events are received (Razorpay webhook secret)
- [ ] Old credentials are deactivated/deleted (not just rotated)
- [ ] Git history cleanup completed ✅ (Mar 2, 2026)
- [ ] **Delete this file** after all rotations are verified
