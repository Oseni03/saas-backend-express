# Development Guide

**Version:** 1.0.0  
**Last Updated:** July 2024

## Table of Contents

1. [Project Structure](#project-structure)
2. [Code Patterns & Conventions](#code-patterns--conventions)
3. [Adding New Endpoints](#adding-new-endpoints)
4. [Database Schema Changes](#database-schema-changes)
5. [Testing Patterns](#testing-patterns)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
express-saas-boilerplate/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── config/
│   │   └── index.ts           # Environment variables + validation
│   ├── controllers/
│   │   ├── authController.ts  # Request handlers for auth
│   │   ├── orgController.ts   # Request handlers for orgs
│   │   └── ...
│   ├── routes/
│   │   └── v1/
│   │       ├── auth.routes.ts # Route definitions
│   │       ├── oauth.routes.ts
│   │       └── index.ts       # Route aggregation
│   ├── services/
│   │   ├── authService.ts     # Business logic for auth
│   │   ├── orgService.ts      # Business logic for orgs
│   │   └── ...
│   ├── repositories/
│   │   ├── userRepository.ts  # Database queries for users
│   │   ├── orgRepository.ts   # Database queries for orgs
│   │   └── ...
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT validation middleware
│   │   ├── errors.ts          # Error definitions
│   │   ├── errorHandler.ts    # Error handler middleware
│   │   ├── validate.ts        # Zod validation middleware
│   │   └── ...
│   ├── lib/
│   │   ├── jwt.ts             # Token signing/verification
│   │   ├── crypto.ts          # Password hashing, TOTP
│   │   ├── email.ts           # Resend email integration
│   │   ├── logger.ts          # Pino logging setup
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── redis.ts           # Redis client setup
│   └── types/
│       ├── express.d.ts       # Express type augmentation
│       └── index.ts           # Global types
├── tests/
│   ├── setup.ts               # Test configuration
│   ├── api/
│   │   ├── auth.test.ts       # API tests
│   │   ├── organizations.test.ts
│   │   └── ...
│   ├── unit/
│   │   ├── crypto.test.ts     # Unit tests
│   │   └── ...
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed script
│   └── migrations/            # Database migrations
├── context/
│   ├── API.md                 # API documentation
│   ├── ARCHITECTURE.md        # Architecture & flows
│   ├── issues/
│   │   ├── 001-*.md           # Issue descriptions
│   │   └── ...
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Test configuration
└── docker-compose.yml         # Local development setup
```

---

## Code Patterns & Conventions

### 1. Controller Pattern

Controllers handle HTTP request/response. Use try-catch with next(error).

```typescript
// src/controllers/userController.ts
import type { Request, Response, NextFunction } from "express";
import { userService } from "../services/userService";

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await userService.updateProfile(req.user!.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
};
```

### 2. Service Pattern

Services contain business logic. Throw AppError subclasses for expected errors.

```typescript
// src/services/userService.ts
import { UnauthorizedError, BadRequestError } from "../middleware/errors";
import { userRepository } from "../repositories/userRepository";

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    return sanitizeUser(user);
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const updated = await userRepository.update(userId, {
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    });
    return sanitizeUser(updated);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await userRepository.findById(userId);
    if (!user?.hashedPassword) throw new BadRequestError("No password set");

    const valid = await verifyPassword(currentPassword, user.hashedPassword);
    if (!valid) throw new UnauthorizedError("Current password incorrect");

    const hashed = await hashPassword(newPassword);
    await userRepository.update(userId, { hashedPassword: hashed });
  },
};
```

### 3. Repository Pattern

Repositories abstract database queries.

```typescript
// src/repositories/userRepository.ts
import { prisma } from "../lib/prisma";

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: UserCreateInput) {
    return prisma.user.create({ data });
  },

  async update(id: string, data: UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
```

### 4. Route Pattern

Define routes with middleware chain. Order matters!

```typescript
// src/routes/v1/auth.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authController } from "../../controllers/authController";

const router = Router();

// Public endpoints
router.post(
  "/register",
  validate(RegisterSchema), // First: validate input
  authController.register   // Then: handle request
);

// Protected endpoints
router.get(
  "/me",
  authenticate,               // First: validate token
  authController.getMe        // Then: handle request
);

export default router;
```

### 5. Validation Pattern

Use Zod schemas for input validation. Middleware auto-validates and formats.

```typescript
// Define schema
const UpdateProfileSchema = z.object({
  full_name: z.string().max(255).optional(),
  avatar_url: z.string().url().optional(),
});

// In route
router.patch(
  "/me",
  authenticate,
  validate(UpdateProfileSchema), // Validates req.body
  userController.updateProfile
);

// In controller, req.body is typed and validated
async updateProfile(req: Request, res: Response, next: NextFunction) {
  // req.body: { full_name?: string, avatar_url?: string }
  // Invalid inputs rejected with 422 before this point
}
```

### 6. Error Pattern

Create domain-specific errors by extending AppError.

```typescript
// src/middleware/errors.ts
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(409, message);
  }
}

// Usage
if (userExists) {
  throw new ConflictError("Email already registered");
}
```

### 7. Middleware Pattern

Middleware functions have signature: `(req, res, next) => void | Promise<void>`

```typescript
// Authentication middleware
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = extractBearerToken(req);
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedError();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Usage in routes
router.get("/protected", authenticate, handler);
```

### 8. Async Patterns

Handle async operations safely with try-catch in controllers.

```typescript
export const handler = async (req: Request, res: Response, next: Function) => {
  try {
    // Async operations
    const result = await someAsyncOperation();

    // If operation fails, throw error (caught by catch)
    if (!result) throw new NotFoundError();

    // Send response
    res.json(result);
  } catch (err) {
    // Pass error to error handler middleware
    next(err);
  }
};
```

---

## Adding New Endpoints

### Step 1: Define Route

```typescript
// src/routes/v1/feature.routes.ts
import { Router } from "express";
import { featureController } from "../../controllers/featureController";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const CreateFeatureSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const router = Router();

router.post(
  "/",
  authenticate,
  validate(CreateFeatureSchema),
  featureController.create
);

router.get("/", authenticate, featureController.list);
router.get("/:id", authenticate, featureController.getOne);
router.patch(
  "/:id",
  authenticate,
  validate(UpdateFeatureSchema),
  featureController.update
);
router.delete("/:id", authenticate, featureController.delete);

export default router;
```

### Step 2: Create Controller

```typescript
// src/controllers/featureController.ts
import type { Request, Response, NextFunction } from "express";
import { featureService } from "../services/featureService";

export const featureController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const feature = await featureService.create(req.user!.id, req.body);
      res.status(201).json(feature);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await featureService.list(req.user!.id, {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const feature = await featureService.getOne(
        req.user!.id,
        req.params.id
      );
      res.json(feature);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const feature = await featureService.update(
        req.user!.id,
        req.params.id,
        req.body
      );
      res.json(feature);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await featureService.delete(req.user!.id, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
```

### Step 3: Create Service

```typescript
// src/services/featureService.ts
import { featureRepository } from "../repositories/featureRepository";
import { NotFoundError, ForbiddenError } from "../middleware/errors";

export const featureService = {
  async create(userId: string, data: CreateFeatureInput) {
    return featureRepository.create({
      ...data,
      createdBy: userId,
    });
  },

  async list(userId: string, pagination: PaginationInput) {
    return featureRepository.list(userId, pagination);
  },

  async getOne(userId: string, featureId: string) {
    const feature = await featureRepository.findById(featureId);
    if (!feature) throw new NotFoundError("Feature");
    if (feature.createdBy !== userId) throw new ForbiddenError();
    return feature;
  },

  async update(
    userId: string,
    featureId: string,
    data: UpdateFeatureInput
  ) {
    await this.getOne(userId, featureId); // Check ownership
    return featureRepository.update(featureId, data);
  },

  async delete(userId: string, featureId: string) {
    await this.getOne(userId, featureId); // Check ownership
    await featureRepository.delete(featureId);
  },
};
```

### Step 4: Create Repository

```typescript
// src/repositories/featureRepository.ts
import { prisma } from "../lib/prisma";

export const featureRepository = {
  async create(data: any) {
    return prisma.feature.create({ data });
  },

  async findById(id: string) {
    return prisma.feature.findUnique({ where: { id } });
  },

  async list(userId: string, { page, limit }: any) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.feature.findMany({
        where: { createdBy: userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.feature.count({ where: { createdBy: userId } }),
    ]);
    return {
      data,
      pagination: { page, limit, total },
    };
  },

  async update(id: string, data: any) {
    return prisma.feature.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.feature.delete({ where: { id } });
  },
};
```

### Step 5: Register Route

```typescript
// src/routes/v1/index.ts
import featureRouter from "./feature.routes";

router.use("/features", featureRouter);
```

---

## Database Schema Changes

### 1. Modify Prisma Schema

```prisma
// prisma/schema.prisma
model Feature {
  id        String   @id @default(cuid())
  name      String
  description String?
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [createdBy], references: [id])

  @@index([createdBy])
  @@map("features")
}

// Add relation to User model
model User {
  // ... existing fields
  features Feature[]
}
```

### 2. Create Migration

```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_features_table

# This creates:
# - Migration file in prisma/migrations/
# - Updates Prisma client types
```

### 3. Seed Data (Optional)

```typescript
// prisma/seed.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.feature.create({
    data: {
      name: "Sample Feature",
      createdBy: "user_123",
    },
  });
}

main();
```

### 4. Run Tests

```bash
npm test
```

---

## Testing Patterns

### API Testing

```typescript
// tests/api/feature.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("POST /api/v1/features", () => {
  it("creates a feature", async () => {
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "Secure1234!",
      });

    const accessToken = registerRes.body.access_token;

    const res = await request(app)
      .post("/api/v1/features")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test Feature",
        description: "A test feature",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Feature");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/v1/features").send({
      name: "Test",
    });

    expect(res.status).toBe(401);
  });

  it("returns 422 with invalid input", async () => {
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "test2@example.com",
        password: "Secure1234!",
      });

    const accessToken = registerRes.body.access_token;

    const res = await request(app)
      .post("/api/v1/features")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "", // Empty name should fail
      });

    expect(res.status).toBe(422);
  });
});
```

### Unit Testing

```typescript
// tests/unit/feature.test.ts
import { describe, it, expect } from "vitest";
import { someUtilityFunction } from "../../src/lib/utils";

describe("Utility function", () => {
  it("returns expected value", () => {
    const result = someUtilityFunction("input");
    expect(result).toBe("expected output");
  });
});
```

---

## Common Tasks

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Database Migrations

```bash
# Create new migration after schema changes
npx prisma migrate dev --name describe_changes

# Apply pending migrations
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

### Seed Database

```bash
# Run seed script
npm run db:seed
```

### Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run typecheck
```

### Local Development

```bash
# Start development server
npm run dev

# Database setup
docker-compose up -d          # Start PostgreSQL + Redis
npx prisma migrate deploy     # Apply migrations
npm run db:seed               # Seed data

# Clean up
docker-compose down           # Stop containers
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Token Invalid

**Problem:** 401 Unauthorized on authenticated endpoint

**Solutions:**
- Check token expiry: Access tokens last 30 minutes
- Refresh token: `POST /auth/refresh` with refresh_token
- Verify token format: `Authorization: Bearer {token}`
- Check token signature: Ensure JWT_ACCESS_SECRET is correct

#### 2. Database Connection Error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
- Start PostgreSQL: `docker-compose up -d`
- Check DATABASE_URL environment variable
- Verify Prisma client: `npx prisma generate`
- Check migrations: `npx prisma migrate status`

#### 3. Validation Error

**Problem:** 422 Unprocessable Entity

**Solutions:**
- Check Zod schema validation rules
- Review error details in response.errors array
- Verify input matches schema types and constraints
- Check middleware order in routes

#### 4. MFA Code Invalid

**Problem:** MFA validation fails with correct code

**Solutions:**
- Ensure system time is synced (TOTP is time-based)
- Check TOTP window: ±30 seconds
- Verify secret wasn't corrupted during setup
- Test with authenticator app directly

#### 5. Prisma Type Errors

**Problem:** `Property 'email' does not exist on type 'User'`

**Solutions:**
- Regenerate Prisma client: `npx prisma generate`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check schema.prisma for typos
- Ensure migration was applied: `npx prisma migrate status`

#### 6. CORS Errors

**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Solutions:**
- Check FRONTEND_URL environment variable
- Verify frontend URL matches cors configuration
- Ensure credentials mode is set on client
- Check request headers

---

## Code Quality Checklist

- [ ] Tests written (API + unit)
- [ ] Code lints without errors
- [ ] TypeScript types correct
- [ ] Error handling implemented
- [ ] Validation schemas defined
- [ ] Documentation updated
- [ ] Database migrations created
- [ ] No hardcoded values
- [ ] Security considerations addressed
- [ ] Performance implications reviewed

---

**For detailed API specifications, see context/API.md**  
**For architecture details, see context/ARCHITECTURE.md**
