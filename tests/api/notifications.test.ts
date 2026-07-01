import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function loginAs(email: string): Promise<{ token: string; userId: string }> {
  await request(app).post("/api/v1/auth/register").send({ email, password: "Secure1234!" });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Secure1234!" });
  const meRes = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${res.body.access_token}`);
  return { token: res.body.access_token, userId: meRes.body.id };
}

describe("GET /api/v1/notifications", () => {
  it("returns empty list for new user", async () => {
    const { token } = await loginAs("notif-empty@example.com");
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.unreadCount).toBe(0);
  });

  it("returns notifications with correct unread count", async () => {
    const { token, userId } = await loginAs("notif-count@example.com");

    await prisma.notification.createMany({
      data: [
        { userId, title: "A", body: "Body A", isRead: false },
        { userId, title: "B", body: "Body B", isRead: false },
        { userId, title: "C", body: "Body C", isRead: true },
      ],
    });

    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.unreadCount).toBe(2);
  });
});

describe("POST /api/v1/notifications/:id/read", () => {
  it("marks a single notification as read", async () => {
    const { token, userId } = await loginAs("notif-read@example.com");

    const notif = await prisma.notification.create({
      data: { userId, title: "Test", body: "Body", isRead: false },
    });

    const res = await request(app)
      .post(`/api/v1/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const unread = await prisma.notification.count({ where: { userId, isRead: false } });
    expect(unread).toBe(0);
  });
});

describe("POST /api/v1/notifications/read-all", () => {
  it("marks all notifications as read", async () => {
    const { token, userId } = await loginAs("notif-readall@example.com");

    await prisma.notification.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        userId,
        title: `Notif ${i}`,
        body: "Body",
        isRead: false,
      })),
    });

    const res = await request(app)
      .post("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const unread = await prisma.notification.count({ where: { userId, isRead: false } });
    expect(unread).toBe(0);
  });
});
