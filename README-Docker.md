# KIBI Platform - Unified Docker Setup

This document describes how to run all KIBI Platform microservices using Docker Compose.

## 🏗️ Architecture Overview

The KIBI Platform consists of three microservices that share a unified database schema:

- **OnBoarding Service** (Port 4000): Manages organizations, affiliates, and user onboarding
- **Events Service** (Port 4001): Handles event management and affiliate registrations
- **BrandCampaign Service** (Port 4002): Manages brand campaigns and affiliate participation

### Infrastructure Components

- **PostgreSQL Database** (Port 5432): Unified database (`postgres`) with all tables
- **Redis Cache** (Port 6379): Session management and JWT token caching

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Ports 4000, 4001, 4002, 5432, and 6379 available

### Option 1: Using the Startup Script (Recommended)

```bash
# Make the script executable (if not already done)
chmod +x start-services.sh

# Start all services
./start-services.sh
```

### Option 2: Manual Docker Compose

```bash
# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Service Endpoints

### OnBoarding Service (Port 4000)
- Health Check: `GET http://localhost:4000/health`
- API Base: `http://localhost:4000/api`
- Key Endpoints:
  - Organization management
  - Affiliate onboarding
  - Super admin operations

### Events Service (Port 4001)
- Health Check: `GET http://localhost:4001/health`
- API Base: `http://localhost:4001/api`
- Key Endpoints:
  - Event management
  - Event registration
  - Forms management

### BrandCampaign Service (Port 4002)
- Health Check: `GET http://localhost:4002/health`
- API Base: `http://localhost:4002/api`
- Key Endpoints:
  - Campaign management
  - Affiliate campaign registration
  - Sports categories

## 🗄️ Database Schema

All services use a unified PostgreSQL database with the following key tables:

### Core Tables
- `super_admin` - Super administrator accounts
- `sports_organizations` - Organization profiles
- `affiliates` - All types of affiliates (athletes, coaches, staff, etc.)
- `invitation_codes` - Invitation management
- `audit_logs` - System audit trail

### Events Tables
- `events` - Event information
- `forms` - Registration forms
- `events_forms` - Event-form mappings
- `affiliate_event_responses` - Event registrations

### Campaign Tables
- `campaigns` - Brand campaign information
- `campaign_affiliate_registrations` - Campaign participation

## 🔧 Environment Configuration

The docker-compose.yml file configures the following environment variables for all services:

```yaml
environment:
  - NODE_ENV=development
  - PORT=[4000|4001|4002]
  - DB_HOST=postgres
  - DB_PORT=5432
  - DB_NAME=postgres
  - DB_USER=postgres
  - DB_PASSWORD=${DB_PASSWORD}
  - REDIS_HOST=redis
  - REDIS_PORT=6379
  - JWT_SECRET=${JWT_SECRET}
  - JWT_EXPIRES_IN=7d
```

## 🛠️ Development Commands

### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f onboarding-service
docker-compose logs -f events-service
docker-compose logs -f brandcampaign-service
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart onboarding-service
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it kibi-postgres psql -U postgres -d postgres

# View database tables
docker exec -it kibi-postgres psql -U postgres -d postgres -c "\dt"
```

### Redis Operations
```bash
# Connect to Redis CLI
docker exec -it kibi-redis redis-cli

# Check Redis connection
docker exec -it kibi-redis redis-cli ping
```

## 📋 Container Management

### View Running Containers
```bash
docker-compose ps
```

### Stop All Services
```bash
docker-compose down
```

### Remove All Data (⚠️ Destructive)
```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

## 🔍 Health Monitoring

Each service provides health check endpoints:

```bash
# Check all services
curl http://localhost:4000/health  # OnBoarding
curl http://localhost:4001/health  # Events
curl http://localhost:4002/health  # BrandCampaign
```

### Expected Health Response
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :4000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database Connection Failed**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Restart database
   docker-compose restart postgres
   ```

3. **Redis Connection Failed**
   ```bash
   # Check Redis logs
   docker-compose logs redis
   
   # Restart Redis
   docker-compose restart redis
   ```

4. **Service Won't Start**
   ```bash
   # Check service logs
   docker-compose logs [service-name]
   
   # Rebuild service
   docker-compose up --build [service-name]
   ```

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ This will delete all data)
docker-compose down -v

# Rebuild and start
docker-compose up --build -d
```

## 🔐 Security Notes

- Default JWT secret is for development only
- Database password should be changed for production
- Services run in development mode with detailed error messages
- All services are accessible without authentication for health checks

## 🚀 Production Deployment

For production deployments to AWS ECR, see:
- **CI/CD Setup**: `CI-CD-README.md` - Complete GitHub Actions workflow documentation
- **ECR Setup**: Run `./setup-ecr.sh` to create ECR repositories
- **Production Testing**: Use `docker-compose.prod.yml` for local production testing

### Production vs Development

| Aspect | Development | Production |
|--------|-------------|------------|
| Dockerfile | `Dockerfile` | `Dockerfile.prod` |
| Command | `npm run dev` | `npm start` |
| Dependencies | All (including dev) | Production only |
| Build | No build step | Multi-stage build |
| User | root | non-root (kibi) |
| Image Size | Larger | Optimized |

## 📚 Additional Resources

- **CI/CD Documentation**: `CI-CD-README.md`
- Individual service documentation in respective directories
- API documentation in `docs/` folders
- cURL test commands in `CURL_TEST_COMMANDS.md` files
- Database schema details in `init.sql`

## 🤝 Contributing

When adding new services:
1. Add service configuration to `docker-compose.yml`
2. Create both `Dockerfile` (dev) and `Dockerfile.prod` (production)
3. Update GitHub Actions workflow in `.github/workflows/deploy-to-ecr.yml`
4. Update this README and CI-CD-README.md
5. Add health check endpoint
6. Follow existing environment variable patterns
7. Use the unified database schema
