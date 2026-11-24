# Real-Time Event Contracts: Supabase Realtime Telemetry

Live spectator terminal updates stream over Supabase Realtime PostgreSQL replication on the `arena_events` table.

---

## Channel Definition

- **Channel Name**: `realtime:arena`
- **Topic**: `public:arena_events`

---

## Event Payloads

### 1. `ATTACK_BLOCKED`
Fired when an adversarial attack in the "Try to Rug It" gauntlet is successfully rejected on-chain or by the enclave.

```json
{
  "eventType": "ATTACK_BLOCKED",
  "attackType": "PEEK_STRATEGY" | "OPERATOR_WITHDRAW" | "OVERSIZED_SWAP" | "CIRCUIT_BREAKER",
  "actor": "5YNmS1R9nNSCDzb5a7mMz1CXK9CGTeEGQTuPxR74zQW4",
  "vault": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "txSignature": "2fKz9P3...",
  "errorCode": "ExceedsMaxPositionCap",
  "errorMessage": "Trade size exceeds the 20% single-trade position cap.",
  "timestamp": "2026-11-20T21:27:15.123Z",
  "explorerUrl": "https://explorer.solana.com/tx/2fKz9P3...?cluster=devnet"
}
```

---

### 2. `TRADE_EXECUTED`
Fired when a risk-bounded trade completes execution through the L1 Risk Firewall.

```json
{
  "eventType": "TRADE_EXECUTED",
  "vault": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "txSignature": "5wLm2Q9...",
  "tradeSide": "BUY",
  "inputAmount": 150000000,
  "outputAmount": 298500000,
  "currentNav": 1000000000,
  "positionPct": 15.0,
  "timestamp": "2026-11-20T21:27:20.456Z",
  "explorerUrl": "https://explorer.solana.com/tx/5wLm2Q9...?cluster=devnet"
}
```

---

### 3. `CIRCUIT_BREAKER_TRIPPED`
Fired when market drawdown trips the 5% rolling daily loss limit and halts the vault.

```json
{
  "eventType": "CIRCUIT_BREAKER_TRIPPED",
  "vault": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "txSignature": "3yPq4R1...",
  "drawdownPct": 6.12,
  "lossLimitPct": 5.0,
  "status": "HALTED",
  "timestamp": "2026-11-20T21:27:25.789Z",
  "explorerUrl": "https://explorer.solana.com/tx/3yPq4R1...?cluster=devnet"
}
```

---

### 4. `EMERGENCY_EXIT_EXECUTED`
Fired when a depositor withdraws remaining capital while the vault is halted.

```json
{
  "eventType": "EMERGENCY_EXIT_EXECUTED",
  "vault": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "depositor": "5YNmS1R9nNSCDzb5a7mMz1CXK9CGTeEGQTuPxR74zQW4",
  "txSignature": "4tVb6K8...",
  "sharesBurned": 1000000,
  "quoteReturned": 940000,
  "timestamp": "2026-11-20T21:27:30.012Z",
  "explorerUrl": "https://explorer.solana.com/tx/4tVb6K8...?cluster=devnet"
}
```
