# Backend Setup & Configuration Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Backend](#running-the-backend)
6. [Database Seeding](#database-seeding)
7. [Project Structure](#project-structure)
8. [API Documentation](#api-documentation)
9. [Docker + Ollama Startup](#docker--ollama-startup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
node --version    # Should be v18+
npm --version     # Should be v9+
psql --version    # Should be PostgreSQL 12+
```

---

## Initial Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd capstone-nest-react-lms
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`, including:
- **NestJS**: The application framework
- **Drizzle ORM**: Database ORM and migrations
- **PostgreSQL Driver**: Database connectivity
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing

### Step 3: Verify Installation

```bash
npm list    # Shows the installed dependency tree
```

---

## Database Setup

### Step 1: Create PostgreSQL Database

Open your PostgreSQL terminal and create a new database:

```bash
# Using psql command line
psql -U postgres

# Inside psql
CREATE DATABASE capstone;
\q
```

Or, using a GUI tool like **pgAdmin** or **DBeaver**:
- Create a new database named `capstone`
- Make sure the server is running on `localhost:5432`
- Default credentials: `postgres` / `password`

### Step 2: Verify Connection

Test your PostgreSQL connection:

```bash
psql -U postgres -h localhost -d capstone
```

If successful, you should see the `capstone=#` prompt. Exit with `\q`.

### Step 3: Run Drizzle Migrations

The schema is defined in `src/drizzle/schema/` using Drizzle ORM.

Generate and push the current schema:

```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

**What this does:**
- `generate:pg`: Creates migration files based on schema changes
- `push:pg`: Applies migrations directly to the database

**Expected Output:**
```
✓ Migrations generated successfully
✓ Migrations applied successfully
```

---

## Environment Configuration

### Step 1: Create `.env` File

Create a `.env` file in the `backend/` directory with the following content:

```env
# ===== DATABASE =====
DATABASE_URL=postgresql://postgres:200411@localhost:5432/capstone

# ===== JWT SECRETS =====
JWT_SECRET=36595a92b327457e615656bd28107c7f15c588f4ab4035a29734011f508e1371
JWT_REFRESH_SECRET=5d7f0c94d3568445e4ebff893c31596f328967d57151ca1d8ceed6651ad6b7a4

# ===== SERVER =====
PORT=3000
NODE_ENV=production

# ===== EMAIL SERVICE =====
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Nexora LMS <your-email@gmail.com>
```

### Step 2: Customize Variables

Replace the following with your actual values:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:port/dbname` |
| `JWT_SECRET` | Secret for signing JWT tokens | Generate with: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Generate with: `openssl rand -hex 32` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `EMAIL_USER` | Gmail address for sending emails | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Gmail app-specific password | Generated in Gmail settings |

### Step 3: Get Gmail App Password

If using Gmail for emails:

1. Enable 2-Factor Authentication on your Google Account
2. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows Computer"
4. Copy the generated password
5. Paste it in `.env` as `EMAIL_PASSWORD`

---

## Running the Backend

### Option 1: Development Mode (Recommended for Development)

Runs with hot reload - changes to code are reflected automatically:

```bash
npm run start:dev
```

**Expected Output:**
```
[Nest] 12345 - 02/11/2026, 10:30:15 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345 - 02/11/2026, 10:30:16 AM     LOG [InstanceLoader] DatabaseModule dependencies...
[Nest] 12345 - 02/11/2026, 10:30:16 AM     LOG [InstanceLoader] AuthModule dependencies...
[Nest] 12345 - 02/11/2026, 10:30:16 AM     LOG [NestApplication] Nest application successfully started
Server running on: http://localhost:3000
```

### Option 2: Production Mode

Builds and runs the optimized version:

```bash
npm run build
npm run start:prod
```

### Option 3: Debug Mode

Runs with Node debugger enabled (for VSCode debugging):

```bash
npm run start:debug
```

### Stopping the Server

- Press `Ctrl + C` in the terminal

---

## Database Seeding

After the database schema is created, populate it with initial data using the seeding script.

### Step 1: Run Seed Script

```bash
node seed-database.js
```

### Step 2: What Gets Created

The seed script automatically creates:

**Roles:**
- ✅ Admin role
- ✅ Teacher role
- ✅ Student role

**Users:**
- ✅ Admin user
  - Email: `admin@lms.local`
  - Password: `Admin123!`
  - Role: Admin

- ✅ Teacher user
  - Email: `teacher@lms.local`
  - Password: `Teacher123!`
  - Role: Teacher

- ✅ Student user
  - Email: `student@lms.local`
  - Password: `Student123!`
  - Role: Student

**Academic Structure:**
- ✅ Section: "Grade 7 - Section A"
  - Grade Level: 7
  - School Year: 2024-2025
  - Adviser: Teacher user

- ✅ Class: "Mathematics" (MATH-7)
  - Subject: Mathematics
  - Section: Grade 7 - Section A
  - Teacher: Teacher user
  - Schedule: MWF 9:00 AM - 10:00 AM

**Enrollment:**
- ✅ Student enrolled in Mathematics class

### Step 3: Expected Output

```
ℹ️  [10:30:15] Connected to database
ℹ️  [10:30:15] Creating roles...
✅ [10:30:15]   ✓ Role 'admin' created
✅ [10:30:15]   ✓ Role 'teacher' created
✅ [10:30:15]   ✓ Role 'student' created
ℹ️  [10:30:15] Creating users...
✅ [10:30:16]   ✓ Admin user created (admin@lms.local)
✅ [10:30:16]   ✓ Teacher user created (teacher@lms.local)
✅ [10:30:16]   ✓ Student user created (student@lms.local)
ℹ️  [10:30:16] Assigning roles to users...
✅ [10:30:16]   ✓ Admin role assigned
✅ [10:30:16]   ✓ Teacher role assigned
✅ [10:30:16]   ✓ Student role assigned
ℹ️  [10:30:16] Creating section...
✅ [10:30:16]   ✓ Section created: Grade 7 - Section A
ℹ️  [10:30:16] Creating class...
✅ [10:30:16]   ✓ Class created: Mathematics (MATH-7)
ℹ️  [10:30:16] Creating student enrollment...
✅ [10:30:16]   ✓ Student enrolled in class

============================================================
DATABASE SEEDING COMPLETED SUCCESSFULLY!
============================================================
```

### Step 4: Customize Seed Data

Edit `seed-database.js` to change default users, password, or section/class data:

```javascript
// Line ~20-50: Customize these objects
const ADMIN_USER = {
  email: 'admin@lms.local',
  password: 'Admin123!',
  firstName: 'System',
  lastName: 'Admin',
};

const TEACHER_USER = {
  email: 'teacher@lms.local',
  password: 'Teacher123!',
  firstName: 'John',
  lastName: 'Doe',
};

// ... etc
```

---

## Project Structure

```
backend/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   ├── config/
│   │   ├── database.config.ts           # Database configuration
│   │   └── jwt.config.ts                # JWT configuration
│   ├── database/
│   │   ├── database.module.ts           # Database module
│   │   └── database.service.ts          # Database service
│   ├── drizzle/
│   │   ├── drizzle.module.ts            # Drizzle module
│   │   └── schema/
│   │       ├── base.schema.ts           # Main database schema
│   │       ├── otp.schema.ts            # OTP verification schema
│   │       └── index.ts                 # Schema exports
│   └── modules/                         # Feature modules
│       ├── admin/                       # Admin management
│       ├── assessments/                 # Assessments & quizzes
│       ├── auth/                        # Authentication
│       ├── classes/                     # Class management
│       ├── lessons/                     # Lesson management
│       ├── enrollments/                 # Enrollment management
│       └── ... more modules
├── test/
│   ├── app.e2e-spec.ts                  # End-to-end tests
│   └── jest-e2e.json                    # Jest E2E configuration
├── drizzle/                             # Migration files (auto-generated)
│   ├── meta/                            # Migration metadata
│   └── *.sql                            # Migration SQL files
├── .env                                 # Environment variables
├── .env.example                         # Environment template
├── .gitignore                           # Git ignore rules
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript configuration
├── drizzle.config.ts                    # Drizzle ORM configuration
├── nest-cli.json                        # NestJS CLI configuration
└── README.md                            # Original project README
```

### Key Directories Explained

**`src/modules/`** - Feature modules organized by domain:
- Each module is self-contained with controllers, services, and DTOs
- Use `nest g resource module-name` to generate new modules

**`src/drizzle/schema/`** - Database schema definitions:
- `base.schema.ts`: Core entities (users, roles, classes, etc.)
- `otp.schema.ts`: One-time password verification
- Auto-migrated with Drizzle Kit

**`drizzle/`** - Migration files:
- Auto-generated by Drizzle Kit
- Do NOT manually edit
- Track changes to schema over time

---

## API Documentation

### Accessing Swagger UI

Once the server is running, access the interactive API documentation:

```
http://localhost:3000/api/docs
```

This provides:
- All available endpoints
- Request/response schema
- Try-it-out functionality
- Authentication setup

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Example: Login and Get Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lms.local",
    "password": "Admin123!"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@lms.local",
    "firstName": "System",
    "lastName": "Admin"
  }
}
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/users` | List all users (Admin only) |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| GET | `/classes` | List classes |
| POST | `/classes` | Create class (Teacher) |
| GET | `/classes/:id` | Get class details |
| GET | `/enrollments` | List enrollments |
| POST | `/enrollments` | Enroll student in class |
| GET | `/lessons/:classId` | Get lessons for a class |
| POST | `/assessments` | Create assessment |
| POST | `/assessments/:id/submit` | Submit assessment |

Full documentation available at `/api/docs` when server is running.

---

## Docker + Ollama Startup

If you run the full stack with Docker Compose, the `ollama` service now blocks startup until the configured model is available.

### Default model

- Docker default: `llama3.2:3b`
- Config path: `backend/.env.docker` (`OLLAMA_MODEL`)

### First run behavior

- On the first `docker compose up --build`, Ollama will pull `llama3.2:3b` before backend starts.
- This can take several minutes depending on network speed.
- Subsequent starts are faster because the model is cached in the `ollama_data` named volume.

### Watch startup logs

```bash
docker compose logs -f ollama
docker compose logs -f backend
```

You should see Ollama logs that it pulled and verified the model, then backend starts after Ollama is healthy.

### Troubleshoot model pull/startup failures

```bash
# Validate effective compose config
docker compose config

# Check if Ollama reports your model in tags
docker compose exec ollama sh -lc "curl -sf http://localhost:11434/api/tags"

# Restart only ollama/backend after fixing env/network
docker compose up -d ollama backend
```

If pull fails (for example, no internet), backend will wait and not start until Ollama becomes healthy with the configured model.

---

## Troubleshooting

### Issue 1: "Cannot connect to database"

**Problem:** Error message about PostgreSQL connection failure

**Solutions:**
```bash
# Check PostgreSQL is running
# Windows: Services UI or
pg_isrunning

# Test connection
psql -U postgres -h localhost -d capstone

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@host:port/database
```

### Issue 2: "Role does not exist"

**Problem:** `error: role "postgres" does not exist`

**Solutions:**
```bash
# Create the postgres superuser if missing
createuser -s -e postgres

# Or use a different user
# Edit DATABASE_URL with existing user credentials
```

### Issue 3: "Port 3000 already in use"

**Problem:** Server fails to start, port 3000 is occupied

**Solutions:**
```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run start:dev
```

### Issue 4: "Migrations not applied"

**Problem:** Schema tables don't exist after `drizzle-kit push`

**Solutions:**
```bash
# Regenerate migration files
npx drizzle-kit generate:pg

# Clear and retry
npx drizzle-kit push:pg --force

# Verify database directly
psql -U postgres -d capstone -c "\dt"
```

### Issue 5: "Module not found"

**Problem:** `Cannot find module '@nestjs/...'`

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Issue 6: "Seed script fails"

**Problem:** `seed-database.js` exits with error

**Solutions:**
```bash
# Verify database connection string in .env
# Must match the connection string format

# Check database exists
psql -U postgres -l  # Lists all databases

# Create database if missing
createdb -U postgres capstone
```

---

## Common Commands Reference

```bash
# Start development server with hot reload
npm run start:dev

# Start production server
npm run build && npm run start:prod

# Generate and apply migrations
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# Seed database with initial data
node seed-database.js

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Format code
npm run format

# Lint code
npm run lint

# Check project structure
npm list

# View all npm scripts
npm run
```

---

## Next Steps

1. ✅ Install Node.js and PostgreSQL
2. ✅ Create database and configure `.env`
3. ✅ Install dependencies: `npm install`
4. ✅ Run migrations: `npx drizzle-kit push:pg`
5. ✅ Seed database: `node seed-database.js`
6. ✅ Start server: `npm run start:dev`
7. ✅ Test API at `http://localhost:3000/api/docs`

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [JWT Explanation](https://jwt.io/)
- [Postman for API Testing](https://www.postman.com/)

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review error messages carefully (they usually indicate the problem)
3. Check that all prerequisites are installed
4. Verify `.env` configuration
5. Ensure PostgreSQL is running

---

**Last Updated:** February 11, 2026
**Version:** 1.0.0
