# Email Configuration Setup

To enable email verification and password reset functionality, you need to configure SMTP settings and PostgreSQL database.

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration (PostgreSQL/Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# SMTP Configuration for Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="no-reply@yourdomain.com"

# Environment
NODE_ENV="development"
PORT="3000"
```

## Database Setup (PostgreSQL/Supabase)

1. **Get your Supabase database URL**:
   - Go to your Supabase project dashboard
   - Navigate to Settings → Database
   - Copy the "Connection string" under "Connection parameters"
   - It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

2. **Set up the database**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

## Gmail Setup (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated app password as `SMTP_PASS`

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
```

### Yahoo
```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
```

### Custom SMTP
Replace with your provider's SMTP settings.

## Testing Email Functionality

1. Start the backend server: `npm start`
2. Try signing up with a real email address
3. Check your email for the verification link
4. Test the forgot password functionality

## Features Implemented

✅ **Email Verification on Signup**
- Users receive a verification email after signup
- Must verify email before logging in
- Verification links expire in 24 hours

✅ **Forgot Password**
- Users can request password reset via email
- Reset links expire in 15 minutes
- Secure token-based password reset

✅ **Resend Verification**
- Users can request new verification emails
- Prevents email enumeration attacks

## Troubleshooting

- **Email not sending**: Check SMTP credentials and network connectivity
- **Verification not working**: Ensure FRONTEND_URL is correctly set
- **Token errors**: Verify JWT_SECRET is set and consistent
