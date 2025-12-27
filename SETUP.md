# Church Mobile Application - Backend API

Enterprise-level NestJS backend for the Church Mobile Application with Prisma ORM and PostgreSQL.

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Google OAuth
- **File Storage**: AWS S3 / Cloudinary
- **Payment**: Flutterwave / Paystack
- **Notifications**: Firebase Cloud Messaging
- **AI**: OpenAI + Pinecone Vector DB

### Project Structure

```
src/
├── auth/                 # Authentication & Authorization
├── users/                # User management
├── books/                # Book store
├── orders/               # Order processing
├── counseling/           # Counseling booking system
├── sermons/              # Sermon library
├── devotionals/          # Daily devotionals
├── announcements/        # Church announcements
├── events/               # Events & registrations
├── prayer-requests/      # Prayer requests
├── testimonies/          # Testimonies
├── groups/               # Departmental groups
├── ai-assistant/         # AI chat assistant
├── notifications/        # Push notifications
├── media/                # File uploads
├── payments/             # Payment processing
├── database/             # Prisma service
└── common/               # Shared utilities
    ├── decorators/       # Custom decorators
    ├── guards/           # Auth guards
    ├── filters/          # Exception filters
    ├── interceptors/     # Response interceptors
    ├── dto/              # Common DTOs
    └── interfaces/       # TypeScript interfaces
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd backend/krccapp-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

Update `.env` with your credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/church_app?schema=public"
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

4. **Database Setup**

Run Prisma migrations:
```bash
npx prisma migrate dev --name init
```

Generate Prisma Client:
```bash
npx prisma generate
```

5. **Run the application**

Development mode:
```bash
npm run start:dev
```

Production mode:
```bash
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000/api/v1`

## 📊 Database Schema

### Core Entities

- **User**: Authentication, profiles, roles
- **Book & BookCategory**: Book store management
- **Order & OrderItem**: Order processing
- **CounselingSlot & CounselingBooking**: Counseling system
- **Sermon & SermonCategory**: Sermon library
- **Devotional**: Daily devotionals
- **Announcement**: Church announcements
- **Event & EventRegistration**: Events management
- **PrayerRequest**: Prayer requests
- **Testimony**: Member testimonies
- **Group & GroupPost**: Departmental groups
- **Notification**: Push notifications
- **Media**: File uploads
- **GivingRecord**: Giving/donations

### View Schema
```bash
npx prisma studio
```

## 🔐 Authentication

### Supported Methods
1. **Email/Password** (Local)
2. **Google OAuth 2.0**
3. **Facebook OAuth** (Optional)

### JWT Strategy
- Access Token: 15 minutes
- Refresh Token: 7 days

### Role-Based Access Control (RBAC)

Roles:
- `MEMBER` - Regular church members
- `WORKER` - Church workers
- `PASTOR` - Pastors/counselors
- `ADMIN` - Administrators
- `SUPER_ADMIN` - Super administrators

## 🛡️ Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Rate limiting (10 req/min default)
- ✅ Input validation & sanitization
- ✅ CORS configuration
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection

## 📝 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Request successful",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "timestamp": "2025-12-26T10:00:00.000Z",
  "path": "/api/v1/users"
}
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Linting
npm run lint

# Database
npx prisma migrate dev    # Create migration
npx prisma migrate deploy # Apply migrations
npx prisma studio         # Database GUI
npx prisma generate       # Generate client
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Check migration status
npx prisma migrate status
```

## 📦 Next Steps

1. Set up your PostgreSQL database
2. Update .env with your database credentials
3. Run `npx prisma migrate dev --name init`
4. Implement authentication strategies (JWT, Google OAuth)
5. Build out module business logic
6. Add integration tests
7. Configure cloud storage for media uploads
8. Set up payment gateway webhooks
9. Implement Firebase notifications
10. Deploy to production

## 👥 Team

Developed by: Wisdom Max
Date: 2025

---

For questions or support, contact the development team.
