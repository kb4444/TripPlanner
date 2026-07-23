function normalizeUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  return "https://" + clean;
}

function findMetaContent(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const direct = new RegExp(
      `<meta\\s+[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ).exec(html);
    if (direct?.[1]) return direct[1];

    const reversed = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ).exec(html);
    if (reversed?.[1]) return reversed[1];
  }

  return "";
}

export async function GET(request: Request) {
  const requestedUrl = new URL(request.url).searchParams.get("url") ?? "";
  const targetUrl = normalizeUrl(requestedUrl);

  if (!targetUrl) {
    return Response.json({ error: "Website URL is required." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return Response.json({ error: "Website URL is not valid." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return Response.json({ error: "Website URL must start with http or https." }, { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "BurnsTravelPlanner/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return Response.json({ error: "Could not load that website." }, { status: 502 });
    }

    const html = await response.text();
    const image = findMetaContent(html.slice(0, 250_000), [
      "og:image",
      "og:image:url",
      "twitter:image",
      "twitter:image:src",
    ]);

    if (!image) {
      return Response.json({ error: "No preview image was found." }, { status: 404 });
    }

    return Response.json({
      imageUrl: new URL(image, response.url || parsedUrl.toString()).toString(),
      sourceUrl: response.url || parsedUrl.toString(),
    });
  } catch {
    return Response.json({ error: "Could not inspect that website." }, { status: 502 });
  }
}
