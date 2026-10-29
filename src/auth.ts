import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import crypto from "crypto";
import { env, getAdminAllowlist } from "@/env";
import { cookies } from "next/headers";

export function verifyAdminPassword(candidate: string): boolean {
  const expected = env.ADMIN_PASSWORD;
  if (!candidate || !expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export function signAdminSessionToken(
  email: string,
  expiresInSeconds = ADMIN_SESSION_MAX_AGE_SECONDS
): string {
  const normalized = email.trim().toLowerCase();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${normalized}|${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(`admin-session:${payload}`)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  const expectedSig = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(`admin-session:${payload}`)
    .digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  const pipeIdx = payload.lastIndexOf("|");
  let email = payload.trim().toLowerCase();
  if (pipeIdx > 0) {
    email = payload.slice(0, pipeIdx).trim().toLowerCase();
    const expiresAt = Number(payload.slice(pipeIdx + 1));
    if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return null;
    }
  }

  const allowlist = getAdminAllowlist();
  return allowlist.includes(email) ? email : null;
}

export const authConfig: NextAuthConfig = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: ADMIN_SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    Credentials({
      id: "admin-credentials",
      name: "Admin Email & Password",
      credentials: {
        email: { label: "Admin Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const allowlist = getAdminAllowlist();

        if (!email || !allowlist.includes(email)) {
          return null;
        }
        if (!verifyAdminPassword(password)) {
          return null;
        }

        return {
          id: `admin-${email}`,
          email,
          name: "Editorial Admin",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      const allowlist = getAdminAllowlist();
      return allowlist.includes(email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Helper used by Admin Server Components and Admin API Routes to get the authenticated admin email.
 */
export async function getAuthenticatedAdminEmail(): Promise<string | null> {
  const allowlist = getAdminAllowlist();

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("hcm_admin_session")?.value;
    if (sessionToken) {
      const verifiedEmail = verifyAdminSessionToken(sessionToken);
      if (verifiedEmail) {
        return verifiedEmail;
      }
    }
  } catch {
    // Ignore cookie read error outside request context
  }

  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase();
    if (email && allowlist.includes(email)) {
      return email;
    }
  } catch {
    // Ignore
  }

  return null;
}
