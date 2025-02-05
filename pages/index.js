// pages/create-pools.js
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';

// Import configuration values
import { PROGRAM_ID, NETWORK } from '../src/config';

// Import the IDL for your deployed program
import idl from '../src/idl/solana_pool_program.json';

import * as anchor from '@project-serum/anchor';

export default function CreatePool() {
  const { publicKey, connected } = useWallet();
  const [depositAmount, setDepositAmount] = useState('');
  const [numRecipients, setNumRecipients] = useState('');
  const [distributionType, setDistributionType] = useState('random'); // or 'equal'
  const [generatedLink, setGeneratedLink] = useState(null);

  // Function to handle pool creation (on-chain)
  const createPool = async (e) => {
    e.preventDefault();
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    // Log config values for debugging
    console.log("Config PROGRAM_ID:", PROGRAM_ID);
    console.log("NETWORK:", NETWORK);

    try {
      // Create a connection to devnet
      const connection = new anchor.web3.Connection(NETWORK, 'confirmed');

      // Create an Anchor provider using your wallet (assumed to be available as window.solana)
      const provider = new anchor.AnchorProvider(connection, window.solana, { preflightCommitment: "confirmed" });
      anchor.setProvider(provider);

      // Load your on-chain program using its IDL and PROGRAM_ID
      const program = new anchor.Program(idl, PROGRAM_ID);
      console.log("Program loaded id (from program):", program.programId.toBase58());
      
      // If your IDL includes metadata with an address, log it as well.
      if (idl.metadata && idl.metadata.address) {
        console.log("IDL declared program id:", idl.metadata.address);
      } else {
        console.log("No program id found in IDL metadata");
      }

      // Convert depositAmount (in SOL) to lamports (1 SOL = 1e9 lamports)
      const lamports = Math.floor(parseFloat(depositAmount) * 1e9);

      // Use a fixed nonce value for testing. 
      // (Ensure that this value matches what your on-chain program expects.)
      const nonce = 1;

      // Derive the PDA for the pool account using the same seeds as in your on-chain program.
      // Seeds: [ "pool", creator pubkey, nonce.to_le_bytes() ]
      const [poolPDA, bump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("pool"),
          publicKey.toBuffer(),
          new anchor.BN(nonce).toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );
      console.log("Derived poolPDA:", poolPDA.toBase58(), "with bump:", bump);

      // Call your on-chain instruction `create_pool`
      await program.rpc.createPool(
        new anchor.BN(lamports),             // deposit_amount (in lamports)
        parseInt(numRecipients),             // num_recipients
        distributionType === "equal" ? new anchor.BN(0) : new anchor.BN(1),  // distribution type flag: 0 for equal, 1 for random
        new anchor.BN(nonce),                // nonce
        {
          accounts: {
            pool: poolPDA,                   // Derived pool account PDA
            creator: publicKey,              // Your wallet public key
            systemProgram: anchor.web3.SystemProgram.programId,
          },
        }
      );

      // If the transaction is successful, funds are deducted from your wallet.
      // Generate a shareable link using the derived pool PDA as the pool identifier.
      const poolId = poolPDA.toBase58();
      const link = `${window.location.origin}/claim?pool=${poolId}`;
      setGeneratedLink(link);

    } catch (error) {
      console.error("Transaction error:", error);
      alert("Error creating pool. Check console for details.");
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Create a Coin Distribution Pool</h1>
      <WalletMultiButton />
      {connected && (
        <form onSubmit={createPool} style={{ marginTop: '2rem' }}>
          <div>
            <label>Deposit Amount (SOL or token): </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Number of Recipients: </label>
            <input
              type="number"
              value={numRecipients}
              onChange={(e) => setNumRecipients(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Distribution Type: </label>
            <select value={distributionType} onChange={(e) => setDistributionType(e.target.value)}>
              <option value="equal">Equal</option>
              <option value="random">Random</option>
            </select>
          </div>
          <button type="submit" style={{ marginTop: '1rem' }}>
            Create Pool & Generate Link
          </button>
        </form>
      )}
      {generatedLink && (
        <div style={{ marginTop: '2rem' }}>
          <p>Your pool has been created!</p>
          <p>
            Share this link with potential recipients:
            <br />
            <a href={generatedLink} target="_blank" rel="noopener noreferrer">
              {generatedLink}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
