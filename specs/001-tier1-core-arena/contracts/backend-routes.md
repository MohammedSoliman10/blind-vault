# Backend API Routes Contract: Next.js 15 App Router

All routes deploy serverlessly on Vercel Hobby tier.

---

## 1. `POST /api/sponsor-tx`

Cosigns transactions as fee-payer for the Zero-Wallet Guest Session, enforces rate limits and program allowlists, and airdrops demo tokens.

### Request Headers
- `Content-Type: application/json`
- `x-forwarded-for: <client_ip>`

### Request Body
```json
{
  "serializedTransaction": "<base64_encoded_unsigned_or_partially_signed_solana_tx>",
  "userPublicKey": "5YNmS1R9nNSCDzb5a7mMz1CXK9CGTeEGQTuPxR74zQW4",
  "actionType": "INIT_SESSION" | "ATTACK_WITHDRAW" | "ATTACK_OVERSIZED" | "ATTACK_DRAWDOWN" | "TRADE" | "DEPOSIT" | "EMERGENCY_EXIT"
}
```

### Validation & Security Controls
1. **Rate Limiting**: In-memory / edge rate limit: maximum 10 requests per minute per IP address. HTTP 429 returned if exceeded.
2. **Program Allowlist**: Deserializes the transaction wire bytes and verifies that EVERY instruction in the transaction targets exclusively:
   - `BLiNDvAuLt...` (Our Blind Vault Program ID)
   - `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` (SPL Token Program)
   - `11111111111111111111111111111111` (System Program)
   - `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (Associated Token Account Program)
3. **Demo Token Airdrop (on `INIT_SESSION`)**: If user has no Demo-USDC token account, the route creates it and mints 1,000 Demo-USDC using the relayer mint authority.

### Success Response (`200 OK`)
```json
{
  "success": true,
  "txSignature": "4uQevvyqUJTa7zJ3J4a2b9F4mZ7F4r1N9...",
  "explorerUrl": "https://explorer.solana.com/tx/4uQevvyqUJTa7zJ3J4a2b9F4mZ7F4r1N9...?cluster=devnet"
}
```

### Error Responses
- `400 Bad Request`: `{ "error": "Transaction contains disallowed program ID" }`
- `429 Too Many Requests`: `{ "error": "Rate limit exceeded. Try again in 60s." }`
- `500 Internal Server Error`: `{ "error": "RPC broadcast failure", "details": "..." }`

---

## 2. `POST /api/signal`

Scrapes market news article content, computes catalyst sentiment score, and prepares enclave execution payload.

### Request Body
```json
{
  "url": "https://cryptonews.example.com/solana-defi-breakthrough"
}
```

### Processing Pipeline
1. **Cache Lookup**: Query `scraped_signals` table by `url_hash` where `expires_at > NOW()`. If found, return cached score immediately.
2. **Firecrawl Scrape**: Call Firecrawl API `/v1/scrape` with `{ "url": url, "formats": ["markdown"] }`.
3. **Catalyst Scoring**: Prompt `gemini-3.8-flash` (or Groq fallback on 429) to extract market sentiment and emit a strict JSON payload:
   ```json
   {
     "score": 82,
     "confidence": 0.95,
     "summary": "Positive liquidity inflow news for Solana ecosystem tokens."
   }
   ```
4. **Hash Generation**: Calculate `signal_hash = SHA256(score + url + timestamp)`.
5. **Cache Store**: Write to `scraped_signals`.

### Success Response (`200 OK`)
```json
{
  "cached": false,
  "url": "https://cryptonews.example.com/solana-defi-breakthrough",
  "catalystScore": 82,
  "signalHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "summary": "Positive liquidity inflow news for Solana ecosystem tokens."
}
```

---

## 3. `GET /api/keepalive`

Automated daily cron route to keep the Supabase free-tier database active.

### Request Headers
- `Authorization: Bearer <CRON_SECRET>`

### Success Response (`200 OK`)
```json
{
  "status": "healthy",
  "timestamp": "2026-11-20T21:27:00.000Z",
  "activeSessions": 1
}
```
