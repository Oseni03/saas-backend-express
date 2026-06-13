import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";

// Use a real test DB or mock Prisma — here we mock the client for unit tests
// For integration tests, swap DATABASE_URL to a test DB in CI

beforeAll(async () => {
  // Connect
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean tables between tests (order matters due to FK constraints)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
