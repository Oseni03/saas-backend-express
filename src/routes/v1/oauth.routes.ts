import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import axios from "axios";
import { OAuthProvider } from "@/generated/prisma";
import { authService } from "../../services/authService";
import { config } from "../../config";
import { project } from "../../config/project";
import { BadRequestError } from "../../middleware/errors";

const router = Router();

// ── Google ────────────────────────────────────────────────────────────────────

router.get("/google", (_req, res) => {
  if (!config.GOOGLE_CLIENT_ID) throw new BadRequestError("Google OAuth is not configured");
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: `${config.APP_BASE_URL}${project.apiPrefix}/oauth/google/callback`,
    response_type: "code",
    scope: project.oauth.google.scope,
    access_type: project.oauth.google.accessType,
  });
  res.json({
    authorization_url: `${project.oauth.google.authUrl}?${params}`,
  });
});

router.get("/google/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) throw new BadRequestError("Missing code");

    const tokenRes = await axios.post(project.oauth.google.tokenUrl, {
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${config.APP_BASE_URL}${project.apiPrefix}/oauth/google/callback`,
      grant_type: "authorization_code",
    });

    const userinfoRes = await axios.get(project.oauth.google.userinfoUrl, {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });
    const info = userinfoRes.data;

    const tokens = await authService.oauthLoginOrRegister(
      OAuthProvider.GOOGLE,
      info.sub,
      info.email,
      info.name,
      info.picture
    );

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// ── GitHub ────────────────────────────────────────────────────────────────────

router.get("/github", (_req, res) => {
  if (!config.GITHUB_CLIENT_ID) throw new BadRequestError("GitHub OAuth is not configured");
  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.APP_BASE_URL}${project.apiPrefix}/oauth/github/callback`,
    scope: project.oauth.github.scope,
  });
  res.json({
    authorization_url: `${project.oauth.github.authUrl}?${params}`,
  });
});

router.get("/github/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) throw new BadRequestError("Missing code");

    const tokenRes = await axios.post(
      project.oauth.github.tokenUrl,
      {
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${config.APP_BASE_URL}${project.apiPrefix}/oauth/github/callback`,
      },
      { headers: { Accept: project.oauth.github.acceptHeader } }
    );

    const accessToken: string = tokenRes.data.access_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [userRes, emailsRes] = await Promise.all([
      axios.get(project.oauth.github.userUrl, { headers }),
      axios.get(project.oauth.github.emailsUrl, { headers }),
    ]);

    const profile = userRes.data;
    const primaryEmail = (
      emailsRes.data as Array<{ email: string; primary: boolean; verified: boolean }>
    ).find((e) => e.primary && e.verified)?.email;
    const email = profile.email ?? primaryEmail;

    if (!email) throw new BadRequestError("Could not retrieve a verified email from GitHub");

    const tokens = await authService.oauthLoginOrRegister(
      OAuthProvider.GITHUB,
      String(profile.id),
      email,
      profile.name,
      profile.avatar_url
    );

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

export default router;
