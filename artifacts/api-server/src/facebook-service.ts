const FB_GRAPH = "https://graph.facebook.com/v19.0";

/**
 * Send a text message to a Facebook Messenger user via the Graph API.
 * Silently skips if FACEBOOK_PAGE_ACCESS_TOKEN is not configured.
 */
export async function sendFacebookMessage(recipientPsid: string, text: string): Promise<void> {
  const token = process.env["FACEBOOK_PAGE_ACCESS_TOKEN"];
  if (!token) return;

  try {
    const res = await fetch(`${FB_GRAPH}/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[facebook] sendMessage error:", err);
    }
  } catch {
    // Best-effort — never block
  }
}

/**
 * Fetch a Facebook user's display name from their PSID.
 * Returns null if not configured or on any error.
 */
export async function getFacebookUserName(psid: string): Promise<string | null> {
  const token = process.env["FACEBOOK_PAGE_ACCESS_TOKEN"];
  if (!token) return null;

  try {
    const res = await fetch(
      `${FB_GRAPH}/${psid}?fields=name,first_name&access_token=${token}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; first_name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the Facebook Page ID for the configured page access token.
 * Used to build the toNumber field.
 */
export async function getFacebookPageId(): Promise<string> {
  const token = process.env["FACEBOOK_PAGE_ACCESS_TOKEN"];
  if (!token) return "page";

  try {
    const res = await fetch(`${FB_GRAPH}/me?fields=id&access_token=${token}`);
    if (!res.ok) return "page";
    const data = (await res.json()) as { id?: string };
    return data.id ?? "page";
  } catch {
    return "page";
  }
}
