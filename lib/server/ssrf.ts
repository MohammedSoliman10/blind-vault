/**
 * SSRF (Server-Side Request Forgery) Protection Helper
 * Validates URLs against private IP ranges, loopback, link-local, and cloud metadata endpoints.
 */

export function isSsrfTarget(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Loopback & host aliases
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    // Cloud metadata endpoints
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
      return true;
    }

    // Private IPv4 ranges (RFC 1918)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      // 10.0.0.0/8
      if (octet1 === 10) return true;
      // 172.16.0.0/12
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
      // 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) return true;
      // 127.0.0.0/8
      if (octet1 === 127) return true;
      // 169.254.0.0/16 Link-local
      if (octet1 === 169 && octet2 === 254) return true;
    }

    return false;
  } catch {
    return true;
  }
}
