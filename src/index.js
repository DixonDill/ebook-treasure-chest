var KEY_TEXT = "97b60394abc2fbe1";
var IV_TEXT = "f5d965df75336270";
var ALLOWED_HOSTS = {
  "pic.sfbjdu.cn": true
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    var requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/health") {
      return new Response("ok", {
        headers: Object.assign(corsHeaders(), {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        })
      });
    }

    var imageUrl = requestUrl.searchParams.get("url") || "";
    if (!imageUrl) return textResponse("missing url", 400);

    var parsed;
    try {
      parsed = new URL(imageUrl);
    } catch (error) {
      return textResponse("bad url", 400);
    }

    if (!/^https:$/.test(parsed.protocol) || !ALLOWED_HOSTS[parsed.hostname]) {
      return textResponse("host not allowed", 403);
    }

    var upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.mrds66.com/"
      }
    });

    if (!upstream.ok) return textResponse("upstream " + upstream.status, upstream.status);

    var encrypted = await upstream.arrayBuffer();
    var decrypted;
    try {
      decrypted = await decryptAesCbc(encrypted);
    } catch (error) {
      return textResponse("decrypt failed", 502);
    }

    return new Response(decrypted, {
      headers: Object.assign(corsHeaders(), {
        "Content-Type": contentTypeFromPath(parsed.pathname),
        "Cache-Control": "public, max-age=604800, immutable"
      })
    });
  }
};

async function decryptAesCbc(encrypted) {
  var key = await crypto.subtle.importKey(
    "raw",
    textBytes(KEY_TEXT),
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  return await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: textBytes(IV_TEXT) },
    key,
    encrypted
  );
}

function textBytes(text) {
  return new TextEncoder().encode(text);
}

function contentTypeFromPath(pathname) {
  var lower = String(pathname || "").toLowerCase();
  if (lower.indexOf(".png") !== -1) return "image/png";
  if (lower.indexOf(".gif") !== -1) return "image/gif";
  if (lower.indexOf(".webp") !== -1) return "image/webp";
  return "image/jpeg";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function textResponse(text, status) {
  return new Response(text, {
    status: status,
    headers: Object.assign(corsHeaders(), {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    })
  });
}
