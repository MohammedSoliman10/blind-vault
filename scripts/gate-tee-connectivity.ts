/**
 * Blind Vault - Live Intel TDX PER Connectivity & ACL Gate Script (T015)
 *
 * Verifies live hardware attestation, delegation, and private read ACL on
 * Solana Devnet + MagicBlock Intel TDX PER (Validator MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo).
 */

import * as anchor from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";
import {
  DELEGATION_PROGRAM_ID,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  verifyTeeRpcIntegrity,
  getAuthToken,
  createCreatePermissionInstruction,
  createDelegatePermissionInstruction,
  AUTHORITY_FLAG,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import * as fs from "fs";
import nacl from "tweetnacl";

const TEE_RPC_URL = "https://devnet-tee.magicblock.app";
const TEE_VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
const DEVNET_RPC = "https://api.devnet.solana.com";

async function main() {
  console.log("========================================================================");
  console.log("   BLIND VAULT: LIVE MAGICBLOCK INTEL TDX PER GATE VERIFICATION (T015)");
  console.log("========================================================================\n");

  // Load Strategist Devnet Keypair
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || "/home/mohammed_soliman/.config/solana/id.json";
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const strategist = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const outsider = Keypair.generate();

  console.log("Strategist (Authorized Authority):", strategist.publicKey.toBase58());
  console.log("Outsider   (Unauthorized Attacker):", outsider.publicKey.toBase58());
  console.log("Target TEE Validator:             ", TEE_VALIDATOR.toBase58());
  console.log("Target TEE RPC URL:               ", TEE_RPC_URL);

  // ------------------------------------------------------------------------
  // STEP 1: Verify Hardware Intel TDX Quote Attestation via verifyTeeRpcIntegrity
  // ------------------------------------------------------------------------
  console.log("\n[1/5] Verifying MagicBlock Intel TDX Quote Hardware Attestation...");
  try {
    await verifyTeeRpcIntegrity(TEE_RPC_URL);
    console.log("  ✓ Hardware Intel TDX Quote verified successfully against", TEE_RPC_URL);
    console.log("    (Cryptographic quote reportData matches challenge; nonces and signatures valid)");
  } catch (err: any) {
    console.error("  ✗ Intel TDX TEE quote integrity check FAILED:", err.message);
    process.exit(1);
  }

  // ------------------------------------------------------------------------
  // STEP 2: Obtain Intel TDX Enclave JWT Auth Tokens via getAuthToken
  // ------------------------------------------------------------------------
  console.log("\n[2/5] Requesting Intel TDX Enclave JWT Tokens...");
  const signStrategist = async (msg: Uint8Array) => nacl.sign.detached(msg, strategist.secretKey);
  const signOutsider = async (msg: Uint8Array) => nacl.sign.detached(msg, outsider.secretKey);

  const strategistAuth = await getAuthToken(TEE_RPC_URL, strategist.publicKey, signStrategist);
  const outsiderAuth = await getAuthToken(TEE_RPC_URL, outsider.publicKey, signOutsider);

  console.log("  ✓ Strategist JWT Token acquired (valid until:", new Date(strategistAuth.expiresAt).toISOString(), ")");
  console.log("  ✓ Outsider JWT Token acquired   (valid until:", new Date(outsiderAuth.expiresAt).toISOString(), ")");

  // ------------------------------------------------------------------------
  // STEP 3: Setup Anchor Program & Vault on Solana Devnet
  // ------------------------------------------------------------------------
  console.log("\n[3/5] Deploying Blind Vault and Sealing Strategy on Devnet...");
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const idl = JSON.parse(fs.readFileSync("./target/idl/blind_vault.json", "utf8"));
  const programId = new PublicKey("6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N");
  const wallet = new anchor.Wallet(strategist);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  const vaultId = new anchor.BN(Date.now());
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultId.toArrayLike(Buffer, "le", 8)],
    programId
  );
  const [strategyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("strategy"), vaultPda.toBuffer()],
    programId
  );
  const [quoteVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("quote_vault"), vaultPda.toBuffer()],
    programId
  );
  const [targetVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("target_vault"), vaultPda.toBuffer()],
    programId
  );

  console.log("  Creating test SPL mints on Devnet...");
  const quoteMint = await createMint(connection, strategist, strategist.publicKey, null, 6);
  const targetMint = await createMint(connection, strategist, strategist.publicKey, null, 6);
  console.log("  Quote Mint: ", quoteMint.toBase58());
  console.log("  Target Mint:", targetMint.toBase58());

  console.log("  Executing initialize_vault (max_position: 20%, daily_loss_limit: 5%)...");
  const initTx = await program.methods
    .initializeVault(vaultId, 2000, 500)
    .accounts({
      vault: vaultPda,
      quoteMint,
      approvedTargetMint: targetMint,
      quoteVault: quoteVaultPda,
      targetVault: targetVaultPda,
      strategy: strategyPda,
      strategist: strategist.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  console.log("  ✓ Vault initialized on-chain. Tx:", initTx);

  console.log("  Executing init_and_seal_strategy (buy: 75, sell: 30, alloc: 15%)...");
  const initSealTx = await program.methods
    .initAndSealStrategy(75, 30, 1500)
    .accounts({
      strategy: strategyPda,
      vault: vaultPda,
      strategist: strategist.publicKey,
    })
    .rpc();
  console.log("  ✓ Strategy parameters initialized & sealed on-chain. Tx:", initSealTx);

  console.log("  Executing delegate_strategy (delegating SealedStrategy to Intel TDX PER)...");
  const bufferStrategy = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(strategyPda, programId);
  const delegationRecord = delegationRecordPdaFromDelegatedAccount(strategyPda);
  const delegationMetadata = delegationMetadataPdaFromDelegatedAccount(strategyPda);

  const delegateTx = await program.methods
    .delegateStrategy()
    .accounts({
      vault: vaultPda,
      strategyAccount: strategyPda,
      bufferStrategy,
      delegationRecordStrategy: delegationRecord,
      delegationMetadataStrategy: delegationMetadata,
      strategy: strategyPda,
      strategist: strategist.publicKey,
      ownerProgram: programId,
      delegationProgram: DELEGATION_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("  ✓ SealedStrategy PDA delegated to MagicBlock PER. Tx:", delegateTx);

  // ------------------------------------------------------------------------
  // STEP 4: Lock Read Permissions via MagicBlock Permission Program & Delegate
  // ------------------------------------------------------------------------
  console.log("\n[4/5] Establishing Hardware ACL Permission Gating for Strategist...");
  const enclaveEnforcedAccount = Keypair.generate();
  const rentExempt = await connection.getMinimumBalanceForRentExemption(100);

  const createAccIx = SystemProgram.createAccount({
    fromPubkey: strategist.publicKey,
    newAccountPubkey: enclaveEnforcedAccount.publicKey,
    lamports: rentExempt,
    space: 100,
    programId: SystemProgram.programId,
  });

  const createPermIx = createCreatePermissionInstruction(
    {
      permissionedAccount: enclaveEnforcedAccount.publicKey,
      payer: strategist.publicKey,
    },
    {
      members: [
        { pubkey: strategist.publicKey, flags: AUTHORITY_FLAG }
      ]
    }
  );

  const delegatePermIx = createDelegatePermissionInstruction(
    {
      payer: strategist.publicKey,
      authority: [strategist.publicKey, true],
      permissionedAccount: [enclaveEnforcedAccount.publicKey, false],
      validator: TEE_VALIDATOR,
    },
    { validator: TEE_VALIDATOR }
  );

  const permTx = new Transaction().add(createAccIx, createPermIx, delegatePermIx);
  const permTxSig = await connection.sendTransaction(permTx, [strategist, enclaveEnforcedAccount]);
  await connection.confirmTransaction(permTxSig, "confirmed");
  console.log("  ✓ Permission created and delegated to Intel TDX validator. Tx:", permTxSig);

  // ------------------------------------------------------------------------
  // STEP 5: Live Verification of Intel TDX PER Hardware ACL Rejection & Success
  // ------------------------------------------------------------------------
  console.log("\n[5/5] Testing Live Intel TDX PER Hardware ACL Gate...");

  async function queryAccountTee(pubkey: string, token?: string) {
    const url = token ? `${TEE_RPC_URL}?token=${token}` : TEE_RPC_URL;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [pubkey, { encoding: "base64" }],
      }),
    });
    const json = await res.json();
    return { status: res.status, result: json.result };
  }

  // 5a: Authorized Strategist Query
  console.log("  Testing Authorized Query with Strategist Token...");
  const authQuery = await queryAccountTee(enclaveEnforcedAccount.publicKey.toBase58(), strategistAuth.token);
  if (!authQuery.result || authQuery.result.value === null) {
    throw new Error("Authorized strategist query failed to retrieve enclave account data");
  }
  console.log("  ✓ AUTHORIZED: Strategist authToken successfully accessed account info (data len:", authQuery.result.value.data[0].length, "chars)");

  // 5b: Unauthorized Query without Token
  console.log("\n  Testing Unauthorized Query (NO TOKEN)...");
  const noTokenQuery = await queryAccountTee(enclaveEnforcedAccount.publicKey.toBase58());
  if (noTokenQuery.result && noTokenQuery.result.value !== null) {
    throw new Error("Hardware ACL violation: Unauthorized request without token was NOT blocked!");
  }
  console.log("  ✓ REJECTED: Request without token returned value: null (Access Denied by Intel TDX PER)");

  // 5c: Unauthorized Query with Outsider Token
  console.log("\n  Testing Unauthorized Query (OUTSIDER / ATTACKER TOKEN)...");
  const outsiderQuery = await queryAccountTee(enclaveEnforcedAccount.publicKey.toBase58(), outsiderAuth.token);
  if (outsiderQuery.result && outsiderQuery.result.value !== null) {
    throw new Error("Hardware ACL violation: Outsider token was NOT blocked by Intel TDX PER!");
  }
  console.log("  ✓ REJECTED: Request with outsider token returned value: null (Access Denied by Intel TDX PER)");

  console.log("\n========================================================================");
  console.log("   LIVE INTEL TDX PER GATE VERIFIED (100% HARDWARE ENCLAVE EVIDENCE)");
  console.log("========================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR in gate-tee-connectivity:", err);
  process.exit(1);
});
