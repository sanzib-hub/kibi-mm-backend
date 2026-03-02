# KIBI Affiliate OnBoarding Microservice

A comprehensive microservice that handles the complete affiliate onboarding flow for the KIBI Sports Platform, including organization management, affiliate invitations, and OTP-based verification.

## Architecture Overview

This microservice implements the following onboarding flow:

1. **Super Admin Panel** → Onboards Sports Organizations
2. **Sports Organization Panel** → Adds Affiliates → Sends Invitation Codes  
3. **Affiliates** → Use Invitation Code + OTP → Complete Signup
4. **Non-Affiliates** → Request Invitation Code → Admin Approval → Follow above process

## Features

### Super Admin Capabilities
- Login and authentication
- Onboard sports organizations directly
- View and manage all organizations
- Update organization status (Approve/Reject/Suspend)
- Review non-affiliate invitation requests
- Approve/reject non-affiliate requests and generate invitation codes

### Sports Organization Capabilities  
- Login and authentication
- Add individual affiliates
- Bulk add affiliates (up to 50 at once)
- View and manage all affiliates
- Resend invitation codes
- Dashboard with statistics

### Affiliate Capabilities
- Request OTP using invitation code and phone number
- Verify OTP and complete signup with password
- Login after successful signup
- View profile information
- Request invitation code (for non-affiliates)

## Tech Stack

- **Runtime**: Node.js with TypeScript (ES modules)
- **Framework**: Express.js with CORS
- **Database**: PostgreSQL with Kysely ORM
- **Caching**: Redis for OTP and JWT token caching
- **Authentication**: JWT tokens with role-based access control
- **Validation**: Joi schemas
- **SMS**: Configurable SMS service (Mock/Fast2SMS)
- **Password Hashing**: bcrypt
- **Environment**: dotenv for configuration
- **Containerization**: Docker & Docker Compose

## Project Structure

```
src/
├── controllers/
│   ├── superAdmin/
│   │   └── superAdminController.ts
│   ├── organization/
│   │   └── organizationController.ts
│   └── affiliate/
│       └── affiliateController.ts
├── database/
│   └── kysely/
│       ├── databases.ts
│       └── types.ts
├── interfaces/
│   └── jwtPayloads.ts
├── middlewares/
│   └── auth.ts
├── routers/
│   ├── superAdminRouter.ts
│   ├── organizationRouter.ts
│   └── affiliateRouter.ts
├── utils/
│   ├── crypto/
│   │   └── crypto.ts
│   ├── jwt/
│   │   └── jwt.ts
│   ├── sms/
│   │   └── smsService.ts
│   ├── redis/
│   │   └── redis.ts
│   └── cache/
│       └── cacheService.ts
├── app.ts
└── server.ts
```

## Database Schema

### Core Tables
- `super_admin` - Super admin accounts
- `sports_organizations` - Sports organizations with approval workflow
- `affiliates` - Athletes/affiliates under organizations
- `invitation_codes` - Invitation codes with expiry and usage tracking
- `non_affiliate_requests` - Requests from non-affiliated users
- `otp_verification` - OTP verification for signup process
- `audit_logs` - Complete audit trail of all actions

## Quick Start

### 1. Setup Environment
```bash
cp .env.example .env
# Update .env with your database credentials and JWT secret
```

### 2. Start with Docker (Recommended)
```bash
# Start PostgreSQL and the service
docker-compose up -d

# View logs
docker-compose logs -f affiliate-onboarding-service
```

### 3. Manual Setup
```bash
# Install dependencies
npm install

# Start PostgreSQL (ensure it's running on port 5432)
# Run the init.sql script to create tables and sample data

# Start development server
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Super Admin API (`/api/super-admin`)
- `POST /login` - Super admin authentication with JWT caching
- `POST /organizations` - Onboard new sports organization
- `GET /organizations` - Get all organizations with pagination and filters
- `PATCH /organizations/:id/status` - Update organization status (approve/reject/suspend)
- `GET /non-affiliate-requests` - Get pending non-affiliate invitation requests
- `PATCH /non-affiliate-requests/:id/review` - Approve/reject non-affiliate requests

### Organization API (`/api/organization`)
- `POST /login` - Organization authentication with JWT caching
- `POST /affiliates` - Add single affiliate with invitation code generation
- `POST /affiliates/bulk` - Bulk add affiliates (max 50) with batch invitation codes
- `GET /affiliates` - Get organization's affiliates with pagination and filters
- `POST /affiliates/:id/resend-invitation` - Resend invitation code to affiliate
- `PATCH /affiliates/:id/status` - Update affiliate status (PENDING/VERIFIED/BANNED/FLAGGED)
- `GET /dashboard/stats` - Get dashboard statistics and analytics

### Affiliate API (`/api/affiliate`)
- `POST /request-otp` - Request OTP with invitation code (Redis cached for 5 minutes)
- `POST /verify-otp-signup` - Verify OTP and complete signup with JWT generation
- `POST /request-invitation` - Request invitation code (for non-affiliates)
- `POST /login` - Affiliate authentication with JWT caching
- `GET /profile` - Get affiliate profile information (requires authentication)

### Redis Caching Features
- **OTP Caching**: 5-minute TTL with automatic expiration and cache invalidation
- **JWT Caching**: 1-hour TTL for all user types with token reuse optimization
- **Performance**: Reduced database queries and faster authentication responses

## Authentication & Authorization

The service uses JWT-based authentication with three user types:

1. **SUPER_ADMIN** - Full system access
2. **ORGANIZATION** - Manage own affiliates
3. **AFFILIATE** - Access own profile and data

### Sample Credentials

**Super Admin:**
- Email: `admin@kibisports.com`
- Password: `admin123`

**Organizations:**
- Email: `admin@elitesports.com` / Password: `admin123`
- Email: `info@champions.com` / Password: `admin123`

## SMS Integration

The service includes a configurable SMS system:

- **Development**: Uses MockSMSService (logs to console)
- **Production**: Can use Fast2SMS or other providers
- Configure `FAST2SMS_API_KEY` in environment variables

## Complete Onboarding Flow

### 1. Organization Onboarding
```bash
# Super admin onboards organization
POST /api/super-admin/organizations
{
  "name": "Sports Academy",
  "email": "admin@academy.com",
  "phone": "+919876543210",
  "password": "securepass123"
}
```

### 2. Add Affiliates
```bash
# Organization adds affiliate
POST /api/organization/affiliates
{
  "name": "John Doe",
  "phone": "+919876543220",
  "email": "john@example.com",
  "sportsCategory": "Cricket"
}
# System generates invitation code and sends SMS
```

### 3. Affiliate Signup
```bash
# Step 1: Request OTP
POST /api/affiliate/request-otp
{
  "phone": "+919876543220",
  "invitationCode": "ELITE001"
}

# Step 2: Verify OTP and signup
POST /api/affiliate/verify-otp-signup
{
  "phone": "+919876543220",
  "otp": "123456",
  "invitationCode": "ELITE001",
  "password": "mypassword123"
}
```

### 4. Non-Affiliate Flow
```bash
# Step 1: Request invitation
POST /api/affiliate/request-invitation
{
  "name": "Jane Smith",
  "phone": "+919876543230",
  "email": "jane@example.com",
  "sportsCategory": "Tennis",
  "reason": "Want to join KIBI platform"
}

# Step 2: Super admin reviews and approves
PATCH /api/super-admin/non-affiliate-requests/1/review
{
  "status": "APPROVED",
  "comments": "Good profile, approved"
}

# Step 3: User follows normal OTP flow with generated code
```

## Docker Deployment

The service includes complete Docker configuration:

- **PostgreSQL**: Runs on port 5432 with initialized schema and sample data
- **Redis**: Runs on port 6380 for OTP and JWT caching
- **Service**: Runs on port 4000 with auto-restart and Redis integration
- **Volumes**: Persistent database and Redis storage
- **Environment**: Configurable via docker-compose.yml and .env files

## Monitoring & Logging

- Health check endpoint: `GET /health`
- Comprehensive audit logging for all actions
- Database connection monitoring
- Redis connection monitoring with graceful fallback
- SMS delivery status tracking
- Cache hit/miss logging for performance optimization

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Initialize Schemas in postgres

```
cat init.sql | docker exec -i onboarding-postgres psql -U postgres -d postgres 
```

## Security Features

- JWT token-based authentication with Redis caching
- Password hashing with bcrypt (12 rounds)
- OTP expiry and attempt limits with Redis TTL
- Invitation code expiry tracking
- Role-based access control with middleware validation
- Input validation with Joi schemas
- SQL injection prevention with Kysely ORM
- Secure Redis connection with optional password authentication

## Scalability

- Stateless design for horizontal scaling
- Redis caching for improved performance and reduced database load
- Database connection pooling
- Efficient indexing for performance
- Paginated API responses
- Bulk operations support
- Cache-first authentication strategy

## Integration

This microservice can be integrated with:
- Main KIBI backend for events and campaigns
- Frontend applications (web/mobile)
- SMS gateways (Fast2SMS, Twilio, etc.)
- Email services for notifications
- File storage services for documents

The service exposes RESTful APIs and can be easily integrated into existing systems or used as a standalone onboarding solution.


## How to connet postgres from cli local

```bash
docker exec -it <container_id> psql -U postgres
```
