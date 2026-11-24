import { LiteSVM, FailedTransactionMetadata, TransactionMetadata } from 'litesvm';
import * as web3 from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

// Load IDL
const idlPath = fs.existsSync(path.resolve(process.cwd(), 'lib/solana/idl/blind_vault.json'))
  ? path.resolve(process.cwd(), 'lib/solana/idl/blind_vault.json')
  : path.resolve(process.cwd(), 'target/idl/blind_vault.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
const PROGRAM_ID = new web3.PublicKey(idl.address);
const SBF_PATH = path.resolve(process.cwd(), 'target/deploy/blind_vault.so');
const MAGIC_PROGRAM_ID = 'Magic11111111111111111111111111111111111111';

interface TestContext {
  svm: LiteSVM;
  program: anchor.Program;
  strategist: web3.Keypair;
  depositor: web3.Keypair;
  attacker: web3.Keypair;
  quoteMint: web3.Keypair;
  approvedTargetMint: web3.Keypair;
  unapprovedMint: web3.Keypair;
  depositorQuoteAta: web3.Keypair;
  attackerQuoteAta: web3.Keypair;
  vaultPda: web3.PublicKey;
  strategyPda: web3.PublicKey;
  quoteVaultPda: web3.PublicKey;
  targetVaultPda: web3.PublicKey;
  depositorPosPda: web3.PublicKey;
  demoPoolPda: web3.PublicKey;
  poolQuoteVaultPda: web3.PublicKey;
  poolBaseVaultPda: web3.PublicKey;
  unapprovedPoolPda: web3.PublicKey;
  unapprovedPoolQuoteVaultPda: web3.PublicKey;
  unapprovedPoolBaseVaultPda: web3.PublicKey;
  vaultId: anchor.BN;
}

function sendTx(svm: LiteSVM, tx: web3.Transaction, signers: web3.Keypair[]): TransactionMetadata | FailedTransactionMetadata {
  tx.recentBlockhash = svm.latestBlockhash();
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  return (svm as any).inner.sendLegacyTransaction(tx.serialize());
}

function assertSuccess(res: TransactionMetadata | FailedTransactionMetadata, label: string) {
  if (res instanceof FailedTransactionMetadata) {
    const logs = res.meta().logs();
    throw new Error(`[FAIL] ${label} failed unexpectedly with error: ${JSON.stringify(res.err())}\nLogs: ${logs.join('\n')}`);
  }
}

function assertError(
  res: TransactionMetadata | FailedTransactionMetadata,
  expectedPattern: string | RegExp,
  label: string
) {
  if (!(res instanceof FailedTransactionMetadata)) {
    throw new Error(`[FAIL] ${label} succeeded when it was expected to fail!`);
  }
  const logs = res.meta().logs().join('\n');
  const matched = typeof expectedPattern === 'string'
    ? logs.includes(expectedPattern)
    : expectedPattern.test(logs);

  if (!matched) {
    throw new Error(
      `[FAIL] ${label} failed with wrong error.\nExpected pattern: ${expectedPattern}\nActual logs:\n${logs}`
    );
  }
}

async function setupTestContext(): Promise<TestContext> {
  const svm = new LiteSVM();
  svm.addProgramFromFile(PROGRAM_ID.toBase58() as any, SBF_PATH);
  // Add MagicBlock PER commit CPI handler mock
  svm.addProgramFromFile(MAGIC_PROGRAM_ID as any, SBF_PATH);

  const strategist = web3.Keypair.generate();
  const depositor = web3.Keypair.generate();
  const attacker = web3.Keypair.generate();

  svm.airdrop(strategist.publicKey.toBase58() as any, 10_000_000_000n as any);
  svm.airdrop(depositor.publicKey.toBase58() as any, 10_000_000_000n as any);
  svm.airdrop(attacker.publicKey.toBase58() as any, 10_000_000_000n as any);

  const quoteMint = web3.Keypair.generate();
  const approvedTargetMint = web3.Keypair.generate();
  const unapprovedMint = web3.Keypair.generate();

  // Create 3 token mints
  const mintsTx = new web3.Transaction();
  mintsTx.add(
    web3.SystemProgram.createAccount({
      fromPubkey: strategist.publicKey,
      newAccountPubkey: quoteMint.publicKey,
      space: spl.MINT_SIZE,
      lamports: 1_461_600,
      programId: spl.TOKEN_PROGRAM_ID,
    }),
    spl.createInitializeMintInstruction(quoteMint.publicKey, 6, strategist.publicKey, null),

    web3.SystemProgram.createAccount({
      fromPubkey: strategist.publicKey,
      newAccountPubkey: approvedTargetMint.publicKey,
      space: spl.MINT_SIZE,
      lamports: 1_461_600,
      programId: spl.TOKEN_PROGRAM_ID,
    }),
    spl.createInitializeMintInstruction(approvedTargetMint.publicKey, 6, strategist.publicKey, null),

    web3.SystemProgram.createAccount({
      fromPubkey: strategist.publicKey,
      newAccountPubkey: unapprovedMint.publicKey,
      space: spl.MINT_SIZE,
      lamports: 1_461_600,
      programId: spl.TOKEN_PROGRAM_ID,
    }),
    spl.createInitializeMintInstruction(unapprovedMint.publicKey, 6, strategist.publicKey, null)
  );
  assertSuccess(sendTx(svm, mintsTx, [strategist, quoteMint, approvedTargetMint, unapprovedMint]), 'Create Mints');

  // Create depositor and attacker token accounts
  const depositorQuoteAta = web3.Keypair.generate();
  const attackerQuoteAta = web3.Keypair.generate();

  const userAtasTx = new web3.Transaction();
  userAtasTx.add(
    web3.SystemProgram.createAccount({
      fromPubkey: depositor.publicKey,
      newAccountPubkey: depositorQuoteAta.publicKey,
      space: spl.ACCOUNT_SIZE,
      lamports: 2_039_280,
      programId: spl.TOKEN_PROGRAM_ID,
    }),
    spl.createInitializeAccountInstruction(depositorQuoteAta.publicKey, quoteMint.publicKey, depositor.publicKey),
    spl.createMintToInstruction(quoteMint.publicKey, depositorQuoteAta.publicKey, strategist.publicKey, 50_000_000),

    web3.SystemProgram.createAccount({
      fromPubkey: attacker.publicKey,
      newAccountPubkey: attackerQuoteAta.publicKey,
      space: spl.ACCOUNT_SIZE,
      lamports: 2_039_280,
      programId: spl.TOKEN_PROGRAM_ID,
    }),
    spl.createInitializeAccountInstruction(attackerQuoteAta.publicKey, quoteMint.publicKey, attacker.publicKey)
  );
  assertSuccess(sendTx(svm, userAtasTx, [depositor, depositorQuoteAta, attacker, attackerQuoteAta, strategist]), 'Create User ATAs');

  const vaultId = new anchor.BN(1);
  const vaultIdBuffer = vaultId.toArrayLike(Buffer, 'le', 8);

  const [vaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), vaultIdBuffer], PROGRAM_ID);
  const [strategyPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('strategy'), vaultPda.toBuffer()], PROGRAM_ID);
  const [quoteVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('quote_vault'), vaultPda.toBuffer()], PROGRAM_ID);
  const [targetVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('target_vault'), vaultPda.toBuffer()], PROGRAM_ID);

  const [depositorPosPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('depositor'), vaultPda.toBuffer(), depositor.publicKey.toBuffer()],
    PROGRAM_ID
  );

  // Demo Pool (Approved target mint)
  const [demoPoolPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('demo_pool'), quoteMint.publicKey.toBuffer(), approvedTargetMint.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [poolQuoteVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('pool_quote_vault'), demoPoolPda.toBuffer()],
    PROGRAM_ID
  );
  const [poolBaseVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('pool_base_vault'), demoPoolPda.toBuffer()],
    PROGRAM_ID
  );

  // Unapproved Demo Pool (Quote <-> Unapproved mint)
  const [unapprovedPoolPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('demo_pool'), quoteMint.publicKey.toBuffer(), unapprovedMint.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [unapprovedPoolQuoteVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('pool_quote_vault'), unapprovedPoolPda.toBuffer()],
    PROGRAM_ID
  );
  const [unapprovedPoolBaseVaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('pool_base_vault'), unapprovedPoolPda.toBuffer()],
    PROGRAM_ID
  );

  const provider = new anchor.AnchorProvider(
    new web3.Connection('http://127.0.0.1:8899'),
    new anchor.Wallet(strategist),
    {}
  );
  const program = new anchor.Program(idl, provider);

  // Initialize Vault (max_position: 2000 bps = 20%, daily_loss_limit: 500 bps = 5%)
  const initVaultIx = await program.methods.initializeVault(vaultId, 2000, 500)
    .accounts({
      vault: vaultPda,
      strategy: strategyPda,
      quoteMint: quoteMint.publicKey,
      approvedTargetMint: approvedTargetMint.publicKey,
      quoteVault: quoteVaultPda,
      targetVault: targetVaultPda,
      strategist: strategist.publicKey,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
    }).instruction();
  assertSuccess(sendTx(svm, new web3.Transaction().add(initVaultIx), [strategist]), 'Initialize Vault');

  // Initialize Approved Demo Swap Pool
  const initPoolIx = await program.methods.initializeDemoPool(30)
    .accounts({
      demoPool: demoPoolPda,
      quoteMint: quoteMint.publicKey,
      baseMint: approvedTargetMint.publicKey,
      poolQuoteVault: poolQuoteVaultPda,
      poolBaseVault: poolBaseVaultPda,
      payer: strategist.publicKey,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
    }).instruction();
  assertSuccess(sendTx(svm, new web3.Transaction().add(initPoolIx), [strategist]), 'Initialize Approved Pool');

  // Initialize Unapproved Swap Pool
  const initUnapprovedPoolIx = await program.methods.initializeDemoPool(30)
    .accounts({
      demoPool: unapprovedPoolPda,
      quoteMint: quoteMint.publicKey,
      baseMint: unapprovedMint.publicKey,
      poolQuoteVault: unapprovedPoolQuoteVaultPda,
      poolBaseVault: unapprovedPoolBaseVaultPda,
      payer: strategist.publicKey,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
    }).instruction();
  assertSuccess(sendTx(svm, new web3.Transaction().add(initUnapprovedPoolIx), [strategist]), 'Initialize Unapproved Pool');

  // Fund pools with initial liquidity (100,000,000 each)
  const fundTx = new web3.Transaction();
  fundTx.add(
    spl.createMintToInstruction(quoteMint.publicKey, poolQuoteVaultPda, strategist.publicKey, 100_000_000),
    spl.createMintToInstruction(approvedTargetMint.publicKey, poolBaseVaultPda, strategist.publicKey, 100_000_000),
    spl.createMintToInstruction(quoteMint.publicKey, unapprovedPoolQuoteVaultPda, strategist.publicKey, 100_000_000),
    spl.createMintToInstruction(unapprovedMint.publicKey, unapprovedPoolBaseVaultPda, strategist.publicKey, 100_000_000)
  );
  assertSuccess(sendTx(svm, fundTx, [strategist]), 'Fund Pools Liquidity');

  return {
    svm,
    program,
    strategist,
    depositor,
    attacker,
    quoteMint,
    approvedTargetMint,
    unapprovedMint,
    depositorQuoteAta,
    attackerQuoteAta,
    vaultPda,
    strategyPda,
    quoteVaultPda,
    targetVaultPda,
    depositorPosPda,
    demoPoolPda,
    poolQuoteVaultPda,
    poolBaseVaultPda,
    unapprovedPoolPda,
    unapprovedPoolQuoteVaultPda,
    unapprovedPoolBaseVaultPda,
    vaultId,
  };
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  BLIND VAULT: LITESVM ON-CHAIN EXPLOIT PROOF TEST SUITE (PHASE 2)');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // Test 1: Valid Vault Lifecycle (Happy Path)
  // -------------------------------------------------------------------------
  console.log('TEST 1: Valid Vault Lifecycle (Deposit -> Private Signal -> Bounded Trade -> Withdraw)...');
  {
    const ctx = await setupTestContext();

    // 1. Depositor deposits 1,000,000 quote tokens
    const depositIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depositIx), [ctx.depositor]), 'Deposit 1,000,000 Quote');

    // 2. Private signal evaluation inside enclave (Catalyst score 85 >= 75 buy trigger)
    const signalHash = Array(32).fill(0xaa);
    const evalIx = await ctx.program.methods.evaluateSignalPrivate(85, signalHash, new anchor.BN(1_000_000))
      .accounts({
        strategy: ctx.strategyPda,
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(evalIx), [ctx.strategist]), 'Private Signal Evaluation (Enclave)');

    // 3. Execute bounded trade: 150,000 (15% <= 20% max position cap)
    const tradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(150_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.demoPoolPda,
        poolQuoteVault: ctx.poolQuoteVaultPda,
        poolBaseVault: ctx.poolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(tradeIx), [ctx.strategist]), 'Execute Bounded Trade (15% NAV)');

    // 4. Depositor withdraws 500,000 shares
    const withdrawIx = await ctx.program.methods.withdraw(new anchor.BN(500_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        owner: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(withdrawIx), [ctx.depositor]), 'Withdraw 500,000 Shares');

    console.log('  ✓ Happy path executed cleanly (deposit, private eval, bounded trade, withdrawal).\n');
  }

  // -------------------------------------------------------------------------
  // Test 2: Attack 1 (Unauthorized Enclave Modification / Peek Rejection)
  // -------------------------------------------------------------------------
  console.log('TEST 2: Attack 1 Rejection (Attacker attempts unauthorized enclave strategy modification)...');
  {
    const ctx = await setupTestContext();

    // Attacker tries to modify strategy parameters using init_and_seal_strategy with attacker signer
    const maliciousSealIx = await ctx.program.methods.initAndSealStrategy(99, 10, 5000)
      .accounts({
        strategy: ctx.strategyPda,
        vault: ctx.vaultPda,
        strategist: ctx.attacker.publicKey,
      }).instruction();
    const res = sendTx(ctx.svm, new web3.Transaction().add(maliciousSealIx), [ctx.attacker]);
    assertError(res, /ConstraintRaw|has_one|Error Code/i, 'Unauthorized Enclave Seal Attempt');

    console.log('  ✓ Unauthorized enclave strategy tampering rejected on-chain.');
    console.log('  ℹ Note: Live Intel TDX Hardware PER ACL (getAccountInfo denied without authToken) is verified on Devnet in Phase 3.\n');
  }

  // -------------------------------------------------------------------------
  // Test 3: Attack 2 (Operator/Strategist Theft Rejection)
  // -------------------------------------------------------------------------
  console.log('TEST 3: Attack 2 Rejection (Strategist attempts unauthorized withdrawal on depositor position)...');
  {
    const ctx = await setupTestContext();

    // Depositor deposits 1,000,000 quote tokens
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Depositor Deposit');

    // Operator/Strategist attempts to call withdraw on depositor's position into strategist's account
    const strategistAta = web3.Keypair.generate();
    const createAtaTx = new web3.Transaction().add(
      web3.SystemProgram.createAccount({
        fromPubkey: ctx.strategist.publicKey,
        newAccountPubkey: strategistAta.publicKey,
        space: spl.ACCOUNT_SIZE,
        lamports: 2_039_280,
        programId: spl.TOKEN_PROGRAM_ID,
      }),
      spl.createInitializeAccountInstruction(strategistAta.publicKey, ctx.quoteMint.publicKey, ctx.strategist.publicKey)
    );
    assertSuccess(sendTx(ctx.svm, createAtaTx, [ctx.strategist, strategistAta]), 'Create Strategist ATA');

    const theftWithdrawIx = await ctx.program.methods.withdraw(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: strategistAta.publicKey,
        owner: ctx.strategist.publicKey, // Strategist signs instead of Depositor
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const res = sendTx(ctx.svm, new web3.Transaction().add(theftWithdrawIx), [ctx.strategist]);
    assertError(res, /UnauthorizedDepositor|ConstraintHasOne|ConstraintSeeds/i, 'Operator Theft Attempt');

    console.log('  ✓ Operator theft rejected: Strategist cannot drain depositor shares (has_one = owner / seeds constraint enforced).\n');
  }

  // -------------------------------------------------------------------------
  // Test 4: Attack 3a (Oversized Swap Rejection: >20% NAV)
  // -------------------------------------------------------------------------
  console.log('TEST 4: Attack 3a Rejection (Strategist attempts oversized trade exceeding 20% NAV cap)...');
  {
    const ctx = await setupTestContext();

    // Depositor deposits 1,000,000 quote tokens (NAV = 1,000,000)
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Deposit 1,000,000');

    // Private signal generates pending order nonce = 1
    const evalIx = await ctx.program.methods.evaluateSignalPrivate(85, Array(32).fill(1), new anchor.BN(1_000_000))
      .accounts({
        strategy: ctx.strategyPda,
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(evalIx), [ctx.strategist]), 'Private Eval');

    // Attempt trade of 250,000 quote tokens (25% > 20% max_position_bps limit of 200,000)
    const oversizedTradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(250_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.demoPoolPda,
        poolQuoteVault: ctx.poolQuoteVaultPda,
        poolBaseVault: ctx.poolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const res = sendTx(ctx.svm, new web3.Transaction().add(oversizedTradeIx), [ctx.strategist]);
    assertError(res, /ExceedsMaxPositionCap|0x1771|6001/i, 'Oversized Swap Attempt');

    console.log('  ✓ Oversized trade rejected: 25% trade rejected on-chain by ExceedsMaxPositionCap (cap: 20%).\n');
  }

  // -------------------------------------------------------------------------
  // Test 5: Attack 3b (Unapproved Mint Rejection)
  // -------------------------------------------------------------------------
  console.log('TEST 5: Attack 3b Rejection (Strategist attempts trade targeting non-allowlisted unapproved mint)...');
  {
    const ctx = await setupTestContext();

    // Deposit 1,000,000 quote tokens
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Deposit');

    // Private signal generates pending order nonce = 1
    const evalIx = await ctx.program.methods.evaluateSignalPrivate(85, Array(32).fill(2), new anchor.BN(1_000_000))
      .accounts({
        strategy: ctx.strategyPda,
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(evalIx), [ctx.strategist]), 'Private Eval');

    // Attempt trade targeting unapproved pool
    const unapprovedTradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(100_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.unapprovedPoolPda,
        poolQuoteVault: ctx.unapprovedPoolQuoteVaultPda,
        poolBaseVault: ctx.unapprovedPoolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const res = sendTx(ctx.svm, new web3.Transaction().add(unapprovedTradeIx), [ctx.strategist]);
    assertError(res, /UnapprovedMint|0x1772|6002/i, 'Unapproved Token Swap Attempt');

    console.log('  ✓ Unapproved token trade rejected on-chain by UnapprovedMint.\n');
  }

  // -------------------------------------------------------------------------
  // Test 6: Attack 4 (Drawdown Breaker Trips & Blocks Subsequent Trades)
  // -------------------------------------------------------------------------
  console.log('TEST 6: Attack 4 Rejection (Simulate -6% crash -> trips 5% daily loss limit -> halts vault)...');
  {
    const ctx = await setupTestContext();

    // Deposit 1,000,000 quote tokens
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Deposit');

    // Simulate market price move: -6% (600 bps >= 500 bps limit)
    const crashIx = await ctx.program.methods.simulateMarketMove(600)
      .accounts({
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    const crashRes = sendTx(ctx.svm, new web3.Transaction().add(crashIx), [ctx.strategist]);
    assertSuccess(crashRes, 'Simulate Market Drop -6% (Trips Circuit Breaker)');

    // Verify vault is halted in account state
    const vaultAcc = ctx.svm.getAccount(ctx.vaultPda.toBase58() as any);
    assert(vaultAcc && 'data' in vaultAcc, 'Vault account exists');
    const decodedVault = ctx.program.coder.accounts.decode('vaultState', Buffer.from(vaultAcc.data));
    assert.strictEqual(decodedVault.isHalted, true, 'Vault isHalted flag must be true');

    // Subsequent trade attempts must fail with VaultIsHalted (Error 6000 / 0x1770)
    const tradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(100_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.demoPoolPda,
        poolQuoteVault: ctx.poolQuoteVaultPda,
        poolBaseVault: ctx.poolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const tradeRes = sendTx(ctx.svm, new web3.Transaction().add(tradeIx), [ctx.strategist]);
    assertError(tradeRes, /VaultIsHalted|0x1770|6000/i, 'Subsequent Trade After Circuit Breaker Halt');

    console.log('  ✓ 5% Rolling loss breaker tripped (is_halted = true), subsequent trades blocked by VaultIsHalted.\n');
  }

  // -------------------------------------------------------------------------
  // Test 7: Emergency Depositor Exit (100% Capital Recovery During Halt)
  // -------------------------------------------------------------------------
  console.log('TEST 7: Emergency Escape Hatch (Depositor withdraws 100% of funds while vault is halted)...');
  {
    const ctx = await setupTestContext();

    // Depositor deposits 1,000,000 quote tokens
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Deposit 1,000,000');

    // Halt the vault via market crash
    const crashIx = await ctx.program.methods.simulateMarketMove(600)
      .accounts({
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    sendTx(ctx.svm, new web3.Transaction().add(crashIx), [ctx.strategist]);

    // Emergency withdrawal: Depositor withdraws 100% (1,000,000 shares)
    const emergencyWithdrawIx = await ctx.program.methods.withdraw(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        owner: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const withdrawRes = sendTx(ctx.svm, new web3.Transaction().add(emergencyWithdrawIx), [ctx.depositor]);
    assertSuccess(withdrawRes, 'Emergency Depositor Exit During Vault Halt');

    // Confirm depositor received funds and total shares is 0
    const vaultAcc = ctx.svm.getAccount(ctx.vaultPda.toBase58() as any);
    assert(vaultAcc && 'data' in vaultAcc, 'Vault account exists');
    const decodedVault = ctx.program.coder.accounts.decode('vaultState', Buffer.from(vaultAcc.data));
    assert.strictEqual(decodedVault.totalShares.toNumber(), 0, 'Total shares must be 0 after 100% exit');

    const depositorPosAcc = ctx.svm.getAccount(ctx.depositorPosPda.toBase58() as any);
    assert(depositorPosAcc && 'data' in depositorPosAcc, 'Depositor position exists');
    const decodedPos = ctx.program.coder.accounts.decode('depositorPosition', Buffer.from(depositorPosAcc.data));
    assert.strictEqual(decodedPos.shares.toNumber(), 0, 'Depositor shares must be 0');

    console.log('  ✓ Emergency Exit succeeded: Depositor successfully withdrew 100% of funds while vault was halted.\n');
  }

  // -------------------------------------------------------------------------
  // Test 8: Replay Attack Guard (Reusing old trade nonce reverts)
  // -------------------------------------------------------------------------
  console.log('TEST 8: Replay Attack Prevention (Reusing expired/stale trade nonce reverts)...');
  {
    const ctx = await setupTestContext();

    // Deposit 1,000,000
    const depIx = await ctx.program.methods.deposit(new anchor.BN(1_000_000))
      .accounts({
        vault: ctx.vaultPda,
        depositorPosition: ctx.depositorPosPda,
        quoteVault: ctx.quoteVaultPda,
        depositorTokenAccount: ctx.depositorQuoteAta.publicKey,
        depositor: ctx.depositor.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(depIx), [ctx.depositor]), 'Deposit');

    // Signal eval #1 -> sets pending_nonce = 1
    const evalIx = await ctx.program.methods.evaluateSignalPrivate(85, Array(32).fill(3), new anchor.BN(1_000_000))
      .accounts({
        strategy: ctx.strategyPda,
        vault: ctx.vaultPda,
        strategist: ctx.strategist.publicKey,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(evalIx), [ctx.strategist]), 'Private Eval #1');

    // Trade #1 succeeds (pending_nonce = 1 == vault.trade_nonce (0) + 1 -> vault.trade_nonce becomes 1)
    const tradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(100_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.demoPoolPda,
        poolQuoteVault: ctx.poolQuoteVaultPda,
        poolBaseVault: ctx.poolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    assertSuccess(sendTx(ctx.svm, new web3.Transaction().add(tradeIx), [ctx.strategist]), 'Execute Trade #1');

    // Expire blockhash so subsequent tx has a fresh blockhash in LiteSVM transaction history
    ctx.svm.expireBlockhash();

    // Attempting Trade #2 WITHOUT a new private evaluation uses the old nonce -> must revert with InvalidTradeNonce
    const replayTradeIx = await ctx.program.methods.executeBoundedTrade(new anchor.BN(100_000))
      .accounts({
        vault: ctx.vaultPda,
        strategy: ctx.strategyPda,
        quoteVault: ctx.quoteVaultPda,
        targetVault: ctx.targetVaultPda,
        demoPool: ctx.demoPoolPda,
        poolQuoteVault: ctx.poolQuoteVaultPda,
        poolBaseVault: ctx.poolBaseVaultPda,
        strategist: ctx.strategist.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      }).instruction();
    const replayRes = sendTx(ctx.svm, new web3.Transaction().add(replayTradeIx), [ctx.strategist]);
    assertError(replayRes, /InvalidTradeNonce|0x1774|6004/i, 'Replay Trade with Stale Nonce');

    console.log('  ✓ Replay attack blocked: Stale trade nonce rejected on-chain by InvalidTradeNonce.\n');
  }

  console.log('========================================================================');
  console.log('  ALL 8 LITESVM TESTS PASSED CLEANLY (100% EXPLOIT REJECTION EVIDENCE)');
  console.log('========================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:\n', err);
  process.exit(1);
});
