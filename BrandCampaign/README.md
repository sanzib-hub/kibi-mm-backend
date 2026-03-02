# KIBI BrandCampaign Microservice

A comprehensive brand campaign management microservice for the KIBI Sports Platform, enabling brands to create campaigns and affiliates to register for brand partnerships.

## 🚀 Features

- **Campaign Management**: Complete CRUD operations for brand campaigns
- **Affiliate Registration**: Seamless registration system for sports professionals
- **Role-Based Authentication**: Secure access control for different user types
- **Advanced Filtering**: Comprehensive search and filter capabilities
- **Pagination Support**: Efficient data retrieval with pagination
- **Real-time Caching**: Redis-based JWT and session caching
- **Input Validation**: Comprehensive request validation using Joi schemas
- **Soft Deletes**: Data integrity with soft deletion patterns
- **Performance Optimized**: Database indexing and query optimization

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Kysely ORM
- **Caching**: Redis
- **Validation**: Joi
- **Authentication**: JWT with Redis caching
- **Containerization**: Docker

### Directory Structure
```
BrandCampaign/
├── src/
│   ├── controllers/           # Business logic controllers
│   ├── database/
│   │   └── kysely/           # Database types and connection
│   ├── interfaces/           # TypeScript interfaces
│   ├── middlewares/          # Authentication and validation middleware
│   ├── routers/              # API route definitions
│   └── utils/                # Utility functions and schemas
├── docs/                     # API documentation
├── Dockerfile               # Container configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 📊 Database Schema

The service uses a unified database schema shared across KIBI microservices:

### Core Tables
- **campaigns**: Brand campaign information
- **campaign_affiliate_registrations**: Junction table for campaign-affiliate relationships
- **affiliates**: Sports professionals (shared with OnBoarding service)
- **sports_organizations**: Organization data (shared with OnBoarding service)
- **super_admin**: Admin user management

### Key Relationships
- Campaigns can have multiple affiliate registrations
- Affiliates can register for multiple campaigns
- All operations maintain referential integrity

## 🔐 Authentication & Authorization

### User Types
1. **Super Admin**: Full campaign management access
2. **Affiliate**: Campaign registration and viewing
3. **General Authenticated**: Basic campaign information access

### Security Features
- JWT-based authentication with Redis caching
- Role-based access control
- Input validation and sanitization
- Soft deletes for data integrity
- Rate limiting capabilities

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd kibi-backend-rework/BrandCampaign
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kibi_common_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Server Configuration
PORT=4002
NODE_ENV=development
```

4. **Database Setup**
```bash
# Initialize the unified database schema
psql -U postgres -d kibi_common_db -f ../init.sql
```

5. **Start the service**
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Docker Setup

1. **Build and run with Docker Compose**
```bash
# From the root directory
docker-compose up --build brandcampaign
```

2. **Individual Docker build**
```bash
docker build -t kibi-brandcampaign .
docker run -p 4002:4002 --env-file .env kibi-brandcampaign
```

## 📚 API Documentation

### Base URL
```
http://localhost:4002
```

### Core Endpoints

#### Campaign Management (Admin Only)
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `GET /api/campaigns/:campaignId/registrations` - Get campaign registrations
- `PUT /api/campaigns/registrations/:registrationId` - Update registration status

#### Public Campaign Access (Authenticated)
- `GET /api/campaigns` - Get all campaigns with filtering
- `GET /api/campaigns/:id` - Get campaign by ID
- `GET /api/campaigns/active` - Get active campaigns
- `GET /api/campaigns/sports-categories` - Get sports categories

#### Affiliate Registration
- `POST /api/campaigns/register` - Register for campaign

### Query Parameters

#### Campaign Filtering
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `brandName` - Filter by brand name
- `sportsCategoryId` - Filter by sports category ID
- `gender` - Filter by gender (MALE, FEMALE, OTHER)
- `dealType` - Filter by deal type (PAID, BARTER, HYBRID)
- `active` - Filter by active status
- `geography` - Filter by geography
- `followersRange` - Filter by followers range
- `ageRange` - Filter by age range

### Request/Response Examples

#### Create Campaign
```bash
POST /api/campaigns
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "logo": "https://example.com/logo.png",
  "description": "Brand campaign description",
  "brandName": "Nike",
  "product": "Running Shoes",
  "sportsCategoryId": 1, // Example ID for 'Running'
  "ageRange": "18-35",
  "gender": "OTHER",
  "geography": "India",
  "followersRange": "1K-10K",
  "dealType": "PAID",
  "deliverables": "Social media posts and reviews",
  "budget": "₹50,000"
}
```

#### Register for Campaign
```bash
POST /api/campaigns/register
Authorization: Bearer <affiliate_token>
Content-Type: application/json

{
  "campaign_id": 1,
  "affiliate_id": 1,
  "additionalData": {
    "portfolioUrl": "https://instagram.com/profile",
    "experience": "5 years competitive running"
  }
}
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Manual Testing
Comprehensive cURL commands are available in `docs/CURL_TEST_COMMANDS.md`

### Integration Testing
```bash
# Health check
curl http://localhost:4002/health

# Service info
curl http://localhost:4002/
```

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
DB_HOST=production_db_host
DB_NAME=kibi_common_db
REDIS_HOST=production_redis_host
JWT_SECRET=production_jwt_secret
PORT=4002
```

### Docker Production Build
```bash
docker build -t kibi-brandcampaign:latest .
docker run -d -p 4002:4002 --env-file .env.prod kibi-brandcampaign:latest
```

### Health Monitoring
- Health endpoint: `GET /health`
- Service info: `GET /`
- Built-in Docker health checks

## 📈 Performance Considerations

### Database Optimization
- Proper indexing on frequently queried columns
- Efficient pagination with count optimization
- Selective field queries to minimize data transfer

### Caching Strategy
- JWT tokens cached in Redis (1-hour expiry)
- Session data caching for performance
- Connection pooling for database efficiency

### Monitoring
- Request/response logging
- Error tracking and reporting
- Performance metrics collection

## 🔧 Development

### Code Style
- TypeScript strict mode enabled
- ESLint configuration for code quality
- Consistent error handling patterns

### Adding New Features
1. Create controller functions in `src/controllers/`
2. Add validation schemas in `src/utils/`
3. Define routes in `src/routers/`
4. Update database types if needed
5. Add comprehensive tests
6. Update API documentation

### Database Migrations
When adding new fields or tables:
1. Update `../init.sql` with new schema
2. Update TypeScript types in `src/database/kysely/types.ts`
3. Test with existing data

## 🤝 Integration with Other Services

### OnBoarding Service
- Shared database schema for affiliates and organizations
- Common authentication patterns
- Consistent API response formats

### Events Service
- Similar architecture and patterns
- Shared utility functions and middleware
- Unified error handling

## 📋 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... } // For paginated responses
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "details": [ ... ] // For validation errors
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify connection credentials
   - Ensure database exists

2. **Redis Connection Failed**
   - Check Redis service status
   - Verify Redis configuration
   - Check network connectivity

3. **Authentication Errors**
   - Verify JWT secret configuration
   - Check token expiry
   - Ensure proper token format

4. **Validation Errors**
   - Check request body format
   - Verify required fields
   - Validate enum values

### Logs and Debugging
- Application logs available in console
- Database query logs for debugging
- Redis operation logs
- Error stack traces in development mode

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check existing GitHub issues
4. Contact the development team

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

**KIBI Sports Platform** - Empowering sports professionals and organizations through technology.
