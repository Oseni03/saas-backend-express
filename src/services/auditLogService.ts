import type { Request } from "express";
import { auditLogRepository } from "../repositories/auditLogRepository";

interface LogInput {
  action: string;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  request?: Request;
  meta?: Record<string, unknown>;
}

export const auditLogService = {
  async log(input: LogInput) {
    const { request, ...rest } = input;

    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      const forwarded = request.headers["x-forwarded-for"];
      ipAddress = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(",")[0].trim() ?? request.socket.remoteAddress;
      userAgent = request.headers["user-agent"];
    }

    return auditLogRepository.create({ ...rest, ipAddress, userAgent });
  },
};
