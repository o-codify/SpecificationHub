// Shared image helpers used by both the REST upload route and the MCP add_image
// tool: type detection (content-type / filename / magic bytes), MIME lookup, and
// decoding inline data / fetching a URL.

export const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

function extFromMime(ct: string | null | undefined): string | null {
  const mime = (ct ?? "").split(";")[0].trim().toLowerCase();
  return EXT_BY_MIME[mime] ?? null;
}

function extFromName(name: string | undefined): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(name ?? "");
  const e = m ? m[1].toLowerCase() : "";
  if (e === "jpeg") return "jpg";
  return MIME_BY_EXT[e] ? e : null;
}

/** Sniff the image type from the leading bytes (most reliable signal). */
function extFromMagic(buf: Buffer | undefined): string | null {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (buf.toString("latin1", 4, 8) === "ftyp") {
    const brand = buf.toString("latin1", 8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  if (buf.toString("utf8", 0, 256).toLowerCase().includes("<svg")) return "svg";
  return null;
}

/** Best safe image extension from any available signal, or null if unsupported. */
export function pickImageExt(o: {
  contentType?: string | null;
  name?: string;
  buf?: Buffer;
}): string | null {
  return extFromMime(o.contentType) || extFromMagic(o.buf) || extFromName(o.name);
}

export interface ImageBytes {
  buf: Buffer;
  contentType?: string;
}

/** Decode inline image input: a data: URL or a raw base64 string. */
export function decodeImageData(data: string): ImageBytes {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(data.trim());
  if (m) {
    const contentType = m[1] || undefined;
    const buf = m[2]
      ? Buffer.from(m[3], "base64")
      : Buffer.from(decodeURIComponent(m[3]), "utf8");
    return { buf, contentType };
  }
  return { buf: Buffer.from(data, "base64") };
}

/** Download an image from a public http(s) URL. */
export async function fetchImageFromUrl(url: string): Promise<ImageBytes> {
  if (!/^https?:\/\//i.test(url)) throw new Error("url must start with http(s)://");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Could not fetch image (HTTP ${res.status})`);
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too large (max 25MB)");
  return { buf: Buffer.from(ab), contentType: res.headers.get("content-type") || undefined };
}
