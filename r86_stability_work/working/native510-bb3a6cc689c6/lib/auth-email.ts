import { env } from "cloudflare:workers";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8_000;
const RESET_PATH = "/reset-password";

export type PasswordResetEmailInput = {
  to: string;
  token: string;
};

export type PasswordResetEmailResult = {
  id: string;
};

export type AuthEmailErrorCode =
  | "invalid_input"
  | "invalid_configuration"
  | "provider_rejected"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_response";

/**
 * Internal delivery error. API routes should log its code and return a generic
 * response so provider details and account existence are never disclosed.
 */
export class AuthEmailError extends Error {
  readonly code: AuthEmailErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: AuthEmailErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AuthEmailError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

function requiredEnvironmentValue(name: "RESEND_API_KEY" | "AUTH_EMAIL_FROM" | "AUTH_PUBLIC_ORIGIN") {
  const value = String(env[name] ?? "").trim();
  if (!value) {
    throw new AuthEmailError("invalid_configuration", `${name} yapılandırılmamış.`);
  }
  return value;
}

function isValidEmailAddress(value: string) {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) return false;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function isValidSender(value: string) {
  if (!value || value.length > 320 || /[\r\n]/.test(value)) return false;
  const displayNameMatch = value.match(/^.+<([^<>]+)>$/);
  return isValidEmailAddress((displayNameMatch?.[1] ?? value).trim());
}

function trustedPublicOrigin() {
  const configuredOrigin = requiredEnvironmentValue("AUTH_PUBLIC_ORIGIN");
  let parsed: URL;

  try {
    parsed = new URL(configuredOrigin);
  } catch (cause) {
    throw new AuthEmailError("invalid_configuration", "AUTH_PUBLIC_ORIGIN geçerli bir URL değil.", { cause });
  }

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new AuthEmailError(
      "invalid_configuration",
      "AUTH_PUBLIC_ORIGIN yalnızca güvenilir HTTPS origin değerini içermeli.",
    );
  }

  return parsed.origin;
}

function validateResetToken(token: string) {
  if (token.length < 32 || token.length > 512 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new AuthEmailError("invalid_input", "Geçersiz parola sıfırlama belirteci.");
  }
}

export function isPasswordResetEmailConfigured() {
  try {
    const apiKey = requiredEnvironmentValue("RESEND_API_KEY");
    const sender = requiredEnvironmentValue("AUTH_EMAIL_FROM");
    trustedPublicOrigin();
    return !/\s/.test(apiKey) && apiKey.length <= 512 && isValidSender(sender);
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

async function resetEmailIdempotencyKey(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hexadecimalDigest = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `password-reset/${hexadecimalDigest}`;
}

export function buildPasswordResetUrl(token: string) {
  validateResetToken(token);
  const resetUrl = new URL(RESET_PATH, trustedPublicOrigin());
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

export async function sendPasswordResetEmail({ to, token }: PasswordResetEmailInput): Promise<PasswordResetEmailResult> {
  const recipient = to.trim().toLowerCase();
  if (!isValidEmailAddress(recipient)) {
    throw new AuthEmailError("invalid_input", "Geçersiz alıcı e-posta adresi.");
  }

  const apiKey = requiredEnvironmentValue("RESEND_API_KEY");
  if (/\s/.test(apiKey) || apiKey.length > 512) {
    throw new AuthEmailError("invalid_configuration", "RESEND_API_KEY biçimi geçersiz.");
  }

  const sender = requiredEnvironmentValue("AUTH_EMAIL_FROM");
  if (!isValidSender(sender)) {
    throw new AuthEmailError("invalid_configuration", "AUTH_EMAIL_FROM biçimi geçersiz.");
  }

  const resetUrl = buildPasswordResetUrl(token);
  const safeResetUrl = escapeHtml(resetUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(RESEND_EMAILS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": await resetEmailIdempotencyKey(token),
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: "Yaşam Çekirdeği parola sıfırlama",
        text: [
          "Yaşam Çekirdeği hesabınız için parola sıfırlama isteği aldık.",
          "",
          `Yeni bir parola belirlemek için bağlantıyı açın: ${resetUrl}`,
          "",
          "Bu bağlantı 20 dakika geçerlidir ve yalnızca bir kez kullanılabilir.",
          "Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz. Parolanız değiştirilmedi.",
        ].join("\n"),
        html: `<p>Yaşam Çekirdeği hesabınız için parola sıfırlama isteği aldık.</p><p><a href="${safeResetUrl}">Yeni bir parola belirle</a></p><p>Bu bağlantı 20 dakika geçerlidir ve yalnızca bir kez kullanılabilir.</p><p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Parolanız değiştirilmedi.</p>`,
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new AuthEmailError("provider_timeout", "E-posta sağlayıcısı zaman aşımına uğradı.", {
        retryable: true,
        cause,
      });
    }
    throw new AuthEmailError("provider_unavailable", "E-posta sağlayıcısına ulaşılamadı.", {
      retryable: true,
      cause,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AuthEmailError("provider_rejected", "E-posta sağlayıcısı isteği reddetti.", {
      retryable: response.status === 429 || response.status >= 500,
      status: response.status,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new AuthEmailError("provider_invalid_response", "E-posta sağlayıcısı geçersiz yanıt döndürdü.", {
      retryable: true,
      cause,
    });
  }

  const id = typeof payload === "object" && payload !== null && "id" in payload
    ? (payload as { id?: unknown }).id
    : null;
  if (typeof id !== "string" || !id) {
    throw new AuthEmailError("provider_invalid_response", "E-posta sağlayıcısı ileti kimliği döndürmedi.", {
      retryable: true,
    });
  }

  return { id };
}
