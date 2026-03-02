# KIBI Events Microservice

A comprehensive event management microservice for the KIBI Sports Platform, handling event creation, management, and athlete registrations.

## Features

- **Event Management**: Create, update, delete, and approve events
- **Athlete Registration**: Secure athlete registration with payment integration
- **Role-Based Access Control**: Organization, Athlete, and Admin access levels
- **Real-time Caching**: Redis-based JWT and session caching
- **Comprehensive Validation**: Joi schema validation for all endpoints
- **Database Optimization**: Indexed queries and efficient joins
- **Security**: JWT authentication, input sanitization, and audit trails

## Architecture

This microservice follows the same architectural patterns as the OnBoarding service:

```
Events/
├── src/
│   ├── controllers/events/     # Event business logic
│   ├── database/kysely/        # Database configuration and types
│   ├── interfaces/             # TypeScript interfaces
│   ├── middlewares/            # Authentication and validation
│   ├── routers/                # API route definitions
│   ├── utils/                  # Utilities (JWT, Redis, etc.)
│   ├── app.ts                  # Express app configuration
│   └── server.ts               # Server startup
├── docs/                       # API documentation
├── init.sql                    # Database schema
├── package.json                # Dependencies
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and navigate to the Events service:**
   ```bash
   cd /Users/udbhav.agarwal/Downloads/KiBi/kibi-backend-rework/Events
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**
   ```bash
   # Create database
   createdb kibi_events_db
   
   # Run schema
   psql -d kibi_events_db -f init.sql
   ```

5. **Start the service:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build && npm start
   ```

### Using Docker

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f events-service
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Public Endpoints
- `GET /` - Service information
- `GET /health` - Health check
- `GET /api/events` - Get all events (with filtering)

### Organization Endpoints
- `POST /api/events` - Create event
- `PUT /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event
- `GET /api/events/:eventId/athletes` - Get registered athletes

### Athlete Endpoints
- `POST /api/events/register` - Register for event

### Admin Endpoints
- `PUT /api/events/:eventId/approve` - Approve event

## Database Schema

### Core Tables

1. **events** - Main event information
2. **forms** - Registration forms for events
3. **events_forms** - Event-form associations
4. **athlete_event_responses** - Registration data with payment info

### Reference Tables
- **organizations** - Sports organizations (managed by OnBoarding service)
- **athletes** - Athletes (managed by OnBoarding service)

## Configuration

### Environment Variables

```bash
# Server
PORT=4001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kibi_events_db
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# External Services
ONBOARDING_SERVICE_URL=http://localhost:4000
PAYMENT_SERVICE_URL=http://localhost:4002
```

## Development

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm test             # Run tests
npm run test:coverage # Run tests with coverage
```

### Code Structure

- **Controllers**: Business logic and request handling
- **Schemas**: Joi validation schemas
- **Middleware**: Authentication and authorization
- **Types**: TypeScript type definitions
- **Utils**: Shared utilities (JWT, Redis, etc.)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different access levels for different user types
- **Input Validation**: Comprehensive validation using Joi schemas
- **Rate Limiting**: Redis-based rate limiting
- **Audit Trails**: Comprehensive logging of all operations
- **Soft Deletes**: Data integrity through soft deletion

## Integration with Other Services

### OnBoarding Service
- Shares organization and athlete data
- Uses same authentication patterns
- Consistent database schema design

### Payment Service (Future)
- Payment verification for event registrations
- Refund processing for cancelled events

## Monitoring and Health Checks

### Health Endpoint
```bash
curl http://localhost:4001/health
```

### Database Connection
The service automatically tests database connectivity on startup.

### Redis Connection
Redis connection status is monitored and reported in health checks.

## Error Handling

The service implements comprehensive error handling:

- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server errors

## Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Redis Caching**: JWT and session caching
- **Connection Pooling**: Efficient database connection management
- **Selective Updates**: Only update changed fields

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- events.test.ts
```

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t kibi-events-service .

# Run container
docker run -p 4001:4001 --env-file .env kibi-events-service
```

### Production Considerations
- Use environment-specific configuration
- Set up proper logging and monitoring
- Configure SSL/TLS termination
- Set up database backups
- Configure Redis persistence

## API Documentation

Detailed API documentation is available in `docs/API_DOCUMENTATION.md`.

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive comments for complex business logic
3. Include proper error handling
4. Write tests for new features
5. Update documentation as needed

## License

ISC License - KIBI Sports Platform

## Support

For issues and questions, please refer to the main KIBI backend repository or contact the development team.
