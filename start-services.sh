#!/bin/bash

# KIBI Platform - Unified Services Startup Script
# This script starts all three microservices with PostgreSQL and Redis

echo "🚀 Starting KIBI Platform Services..."
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove any orphaned containers
echo "🧹 Cleaning up orphaned containers..."
docker-compose down --remove-orphans

# Build and start all services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait a moment for services to initialize
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
echo ""

# Check PostgreSQL
if docker exec kibi-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Healthy"
else
    echo "❌ PostgreSQL: Not ready"
fi

# Check Redis
if docker exec kibi-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Not ready"
fi

# Check OnBoarding service
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ OnBoarding Service (Port 4000): Healthy"
else
    echo "⏳ OnBoarding Service (Port 4000): Starting up..."
fi

# Check Events service
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "✅ Events Service (Port 4001): Healthy"
else
    echo "⏳ Events Service (Port 4001): Starting up..."
fi

# Check BrandCampaign service
if curl -s http://localhost:4002/health > /dev/null 2>&1; then
    echo "✅ BrandCampaign Service (Port 4002): Healthy"
else
    echo "⏳ BrandCampaign Service (Port 4002): Starting up..."
fi

# Check database initialization
echo ""
echo "🗄️  Database Status:"
if docker exec kibi-postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM super_admin;" > /dev/null 2>&1; then
    echo "✅ Database initialized with sample data"
else
    echo "❌ Database initialization failed"
fi

echo ""
echo "🎉 KIBI Platform Services Started!"
echo "=================================="
echo "📊 Service URLs:"
echo "   • OnBoarding Service: http://localhost:4000"
echo "   • Events Service: http://localhost:4001"
echo "   • BrandCampaign Service: http://localhost:4002"
echo ""
echo "🗄️  Database & Cache:"
echo "   • PostgreSQL: localhost:5432 (Database: postgres)"
echo "   • Redis: localhost:6379"
echo ""
echo "📋 Useful Commands:"
echo "   • View logs: docker-compose logs -f [service-name]"
echo "   • Stop services: docker-compose down"
echo "   • Restart service: docker-compose restart [service-name]"
echo "   • View running containers: docker-compose ps"
echo ""
echo "🔧 Health Checks:"
echo "   • OnBoarding: curl http://localhost:4000/health"
echo "   • Events: curl http://localhost:4001/health"
echo "   • BrandCampaign: curl http://localhost:4002/health"
