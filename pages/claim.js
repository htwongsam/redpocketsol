// pages/claim.js
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';

// Import configuration values from your config file
import { PROGRAM_ID, NETWORK } from '../src/config';

// Import the IDL for your deployed program
import idl from '../src/idl/solana_pool_program.json';

// Import Anchor
import * as anchor from '@project-serum/anchor';

export default function Claim() {
  const router = useRouter();
  const { pool } = router.query; // The pool PDA as a base58 string, e.g. ?pool=...
  const { publicKey, connected } = useWallet();
  const [claimStatus, setClaimStatus] = useState('');

  const claimCoins = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }
    if (!pool) {
      alert('Pool ID not found in URL');
      return;
    }

    console.log("Claiming coins using program ID:", PROGRAM_ID);
    console.log("Network endpoint:", NETWORK);
    console.log("Pool ID (PDA):", pool);

    try {
      // Create a connection to devnet
      const connection = new anchor.web3.Connection(NETWORK, 'confirmed');

      // Create an Anchor provider using your wallet.
      // (Here, we assume window.solana is injected by your wallet like Phantom.)
      const provider = new anchor.AnchorProvider(connection, window.solana, { preflightCommitment: "confirmed" });
      anchor.setProvider(provider);

      // Load your on-chain program using the IDL and PROGRAM_ID
      const program = new anchor.Program(idl, PROGRAM_ID);
      console.log("Loaded program ID:", program.programId.toBase58());

      // Convert the pool id from the URL into a PublicKey
      const poolPubkey = new PublicKey(pool);
      console.log("Using pool account (PDA):", poolPubkey.toBase58());

      setClaimStatus('Processing claim transaction...');

      // Call your on-chain claim instruction.
      // According to your on-chain program, the accounts needed are:
      // - pool: the pool account (PDA)
      // - claimer: the connected wallet (who is claiming the coins)
      // - systemProgram: Solana's System Program.
      await program.rpc.claim({
        accounts: {
          pool: poolPubkey,
          claimer: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });

      setClaimStatus('Claim successful! Coins have been transferred to your wallet.');
    } catch (error) {
      console.error("Transaction error:", error);
      setClaimStatus('Claim failed. Please try again. Check console for details.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Claim Your Coins</h1>
      <WalletMultiButton />
      {connected && (
        <div style={{ marginTop: '2rem' }}>
          <p>Pool ID: {pool}</p>
          <button onClick={claimCoins}>Claim Coins</button>
        </div>
      )}
      {claimStatus && <p>{claimStatus}</p>}
    </div>
  );
}
