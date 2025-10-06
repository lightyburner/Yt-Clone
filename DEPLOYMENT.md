# YouTube Clone - Production Deployment Guide

This guide covers deploying the YouTube Clone application to various production platforms.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (for containerized deployment)
- Git
- Platform-specific CLI tools (Railway, Heroku, etc.)

### Environment Variables
Copy `env.production.template` to `.env.production` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key

# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com
```

## 📦 Deployment Options

### 1. Railway (Recommended)

Railway provides the easiest deployment with automatic database provisioning.

#### Setup:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

#### Environment Variables in Railway:
- `DATABASE_URL` (auto-generated)
- `JWT_SECRET`
- `NODE_ENV=production`

### 2. Heroku

#### Setup:
```bash
# Install Heroku CLI
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Login and create app
heroku login
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

### 3. Docker Compose

#### Local Production Setup:
```bash
# Copy environment template
cp env.production.template .env.production

# Edit environment variables
nano .env.production

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy
```

### 4. DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
3. Add environment variables
4. Deploy

### 5. AWS ECS

#### Using Docker:
```bash
# Build and tag image
docker build -t yt-clone:latest .

# Tag for ECR
docker tag yt-clone:latest your-account.dkr.ecr.region.amazonaws.com/yt-clone:latest

# Push to ECR
aws ecr get-login-password --region region | docker login --username AWS --password-stdin your-account.dkr.ecr.region.amazonaws.com
docker push your-account.dkr.ecr.region.amazonaws.com/yt-clone:latest
```

## 🔧 Configuration

### Database Setup

#### PostgreSQL (Production):
```sql
-- Create database
CREATE DATABASE ytclone;

-- Create user
CREATE USER ytclone WITH PASSWORD 'securepassword';
GRANT ALL PRIVILEGES ON DATABASE ytclone TO ytclone;
```

#### Run Migrations:
```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy
```

### File Storage

#### Local Storage (Development):
- Files stored in `uploads/` directory
- Configure `UPLOAD_DIR` environment variable

#### Cloud Storage (Production):
Consider using:
- AWS S3
- Google Cloud Storage
- Cloudinary
- Railway Volumes

### Security Configuration

#### Required Environment Variables:
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 GitHub Actions

The repository includes GitHub Actions for automated deployment:

### Workflows:
- **CI/CD**: Builds and tests on every push
- **Production Deploy**: Deploys to production on main branch
- **Database Migration**: Runs migrations automatically

### Secrets Required:
- `PRODUCTION_DATABASE_URL`
- `JWT_SECRET`
- Platform-specific secrets (Railway token, Heroku API key, etc.)

## 📊 Monitoring

### Health Checks:
- Backend: `GET /health`
- Frontend: `GET /` (served by nginx)

### Logging:
- Application logs via platform logging
- Database query logs (Prisma)
- File upload logs

### Metrics:
- Response times
- Error rates
- Database performance
- File storage usage

## 🔄 Updates and Maintenance

### Database Migrations:
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy to production
npx prisma migrate deploy
```

### Application Updates:
```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
docker-compose down
docker-compose up -d --build
```

### Backup:
```bash
# Database backup
pg_dump $DATABASE_URL > backup.sql

# File backup
tar -czf uploads-backup.tar.gz uploads/
```

## 🐛 Troubleshooting

### Common Issues:

#### Database Connection:
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

#### File Upload Issues:
- Check file permissions
- Verify upload directory exists
- Check file size limits

#### Build Failures:
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Clear Docker cache
docker system prune -a
```

### Logs:
```bash
# Application logs
docker-compose logs backend

# Database logs
docker-compose logs database

# Nginx logs
docker-compose logs frontend
```

## 📈 Performance Optimization

### Production Optimizations:
- Enable gzip compression
- Set up CDN for static assets
- Configure caching headers
- Use Redis for session storage
- Optimize database queries

### Scaling:
- Horizontal scaling with load balancers
- Database read replicas
- CDN for file storage
- Microservices architecture

## 🔒 Security Checklist

- [ ] Change default JWT secret
- [ ] Use HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] File upload validation
- [ ] Input sanitization

## 📞 Support

For deployment issues:
1. Check the logs
2. Verify environment variables
3. Test database connectivity
4. Review platform documentation
5. Create an issue in the repository

---

**Happy Deploying! 🚀**
