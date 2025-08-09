function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

async function verifySignature(signature: string, body: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = "sha256=" + Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, signature);
}

function summarize(event: string, payload: any): string | null {
  if (event === "pull_request") {
    const action = payload.action;
    const pr = payload.pull_request;
    if (action === "opened") {
      return `PR #${pr.number} opened by ${pr.user?.login}: ${pr.title}`;
    }
    if (action === "closed" && pr.merged) {
      return `PR #${pr.number} merged: ${pr.title}`;
    }
  }
  if (event === "workflow_run") {
    const run = payload.workflow_run;
    return `Workflow ${run.name} ${run.status}${run.conclusion ? ` (${run.conclusion})` : ""}`;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("CHATOPS_SIGNING_SECRET");
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const admin = Deno.env.get("ADMIN_USER_ID");
    if (!secret || !token || !admin) {
      console.log("Missing env", { secret: !!secret, token: !!token, admin: !!admin });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const sigHeader = req.headers.get("X-Hub-Signature-256") || "";
    const bodyText = await req.text();
    const valid = await verifySignature(sigHeader, bodyText, secret);
    if (!valid) {
      console.log("invalid signature");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const event = req.headers.get("X-GitHub-Event") || "";
    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      console.error("bad json", e);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const message = summarize(event, payload);
    if (message) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: admin, text: message }),
      }).catch((err) => console.error("telegram error", err));
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});

