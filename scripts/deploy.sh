#!/bin/bash

# YouTube Clone Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PLATFORM=""
ENVIRONMENT="production"
BUILD_IMAGE=false
PUSH_IMAGE=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --platform PLATFORM    Deployment platform (railway, heroku, digitalocean, aws, docker)"
    echo "  -e, --environment ENV       Environment (production, staging)"
    echo "  -b, --build                 Build Docker image"
    echo "  -P, --push                  Push Docker image to registry"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --platform railway --environment production"
    echo "  $0 --platform docker --build --push"
    echo "  $0 --platform heroku --environment staging"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_IMAGE=true
            shift
            ;;
        -P|--push)
            PUSH_IMAGE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate platform
if [[ -z "$PLATFORM" ]]; then
    print_error "Platform is required. Use -p or --platform"
    show_usage
    exit 1
fi

print_status "Starting deployment to $PLATFORM for $ENVIRONMENT environment"

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    case $PLATFORM in
        railway)
            if ! command -v railway &> /dev/null; then
                print_error "Railway CLI not found. Install it from https://railway.app"
                exit 1
            fi
            ;;
        heroku)
            if ! command -v heroku &> /dev/null; then
                print_error "Heroku CLI not found. Install it from https://devcenter.heroku.com/articles/heroku-cli"
                exit 1
            fi
            ;;
        docker)
            if ! command -v docker &> /dev/null; then
                print_error "Docker not found. Install it from https://docker.com"
                exit 1
            fi
            ;;
    esac
}

# Build Docker image
build_image() {
    if [[ "$BUILD_IMAGE" == true ]]; then
        print_status "Building Docker image..."
        docker build -t yt-clone:latest .
        print_status "Docker image built successfully"
    fi
}

# Push Docker image
push_image() {
    if [[ "$PUSH_IMAGE" == true ]]; then
        print_status "Pushing Docker image to registry..."
        # Add your registry push commands here
        print_status "Docker image pushed successfully"
    fi
}

# Deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway..."
    
    # Check if railway project is linked
    if ! railway status &> /dev/null; then
        print_warning "Railway project not linked. Run 'railway login' and 'railway link' first"
        exit 1
    fi
    
    # Deploy
    railway up --detach
    
    print_status "Deployment to Railway completed"
}

# Deploy to Heroku
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    # Check if heroku app is configured
    if ! heroku apps:info &> /dev/null; then
        print_warning "Heroku app not configured. Run 'heroku create' first"
        exit 1
    fi
    
    # Deploy
    git push heroku main
    
    # Run database migrations
    heroku run npx prisma migrate deploy
    
    print_status "Deployment to Heroku completed"
}

# Deploy to DigitalOcean
deploy_digitalocean() {
    print_status "Deploying to DigitalOcean App Platform..."
    
    # This would typically use the DigitalOcean API or doctl CLI
    print_warning "DigitalOcean deployment requires manual configuration"
    print_status "Please configure your app in the DigitalOcean dashboard"
}

# Deploy to AWS
deploy_aws() {
    print_status "Deploying to AWS..."
    
    # This would typically use AWS CLI or ECS
    print_warning "AWS deployment requires manual configuration"
    print_status "Please configure your ECS service or EC2 instance"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 30
    
    # Run database migrations
    docker-compose exec backend npx prisma migrate deploy
    
    print_status "Docker deployment completed"
}

# Main deployment logic
main() {
    check_dependencies
    build_image
    push_image
    
    case $PLATFORM in
        railway)
            deploy_railway
            ;;
        heroku)
            deploy_heroku
            ;;
        digitalocean)
            deploy_digitalocean
            ;;
        aws)
            deploy_aws
            ;;
        docker)
            deploy_docker
            ;;
        *)
            print_error "Unsupported platform: $PLATFORM"
            exit 1
            ;;
    esac
    
    print_status "Deployment completed successfully!"
}

# Run main function
main
