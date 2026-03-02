# KIBI Payments Microservice

A comprehensive payment processing and payout management microservice for the KIBI Sports Platform, handling payment collections, payouts to organizations, and financial operations.

---

## Features

- **Payment Processing:** Secure payment collection via Razorpay integration.
- **Payout Management:** Automated payouts to organizations with commission handling.
- **Contact Management:** Razorpay contact creation and management for organizations.
- **Bank Account Linking:** Secure bank account linking for payouts.
- **Role-Based Access Control:** Organization, Admin, and System access levels.
- **Real-time Caching:** Redis-based JWT and session caching.
- **Comprehensive Validation:** Joi schema validation for all endpoints.
- **Financial Security:** Idempotency keys, audit trails, and secure credential handling.
- **Commission Handling:** Automatic commission deduction for platform fees.

---

## Architecture

This microservice follows the same architectural patterns as other KIBI services:

Payments/
├── src/
│ ├── controllers/payout/ # Payout business logic
│ ├── database/kysely/ # Database configuration and types
│ ├── interfaces/ # TypeScript interfaces
│ ├── middlewares/ # Authentication and validation
│ ├── routers/ # API route definitions
│ ├── schemas/ # Joi validation schemas
│ ├── utils/ # Utilities (JWT, Redis, etc.)
│ ├── app.ts # Express app configuration
│ └── server.ts # Server startup
├── docs/ # API documentation
├── init.sql # Database schema
├── package.json # Dependencies
└── README.md # This file



---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- RazorpayX Account

### Installation

Clone and navigate to the Payments service:

```bash
cd /Users/udbhav.agarwal/Downloads/KiBi/kibi-backend-rework/Payments

npm install

cp .env.example .env
# Edit .env with your Razorpay credentials and database configuration

# Create database
createdb kibi_payments_db

# Run schema
psql -d kibi_payments_db -f init.sql


# Development mode
npm run dev

# Production mode
npm run build && npm start

