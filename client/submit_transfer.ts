import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as snarkjs from "snarkjs";
import { readFileSync } from "fs";
import { ZcashVariant } from "../target/types/zcash_variant"; // Generated IDL

async function main() {
    // Connect to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = Keypair.generate(); // Replace with your keypair
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
        commitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Load program
    const programId = new PublicKey("YourProgramIdHere"); // From anchor deploy
    const program = anchor.workspace.ZcashVariant as Program<ZcashVariant>;

    // Initialize state account
    const [statePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        programId
    );
    await program.methods
        .initialize()
        .accounts({
            state: statePda,
            user: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            amount: "10",
            blinding: String(Math.floor(Math.random() * 1e18)),
        },
        "circuits/build/private_transfer_js/private_transfer.wasm",
        "circuits/build/private_transfer_final.zkey"
    );

    // Parse proof
    const proofA = Buffer.from(proof.pi_a.slice(0, 64)); // G1 point
    const proofB = Buffer.from(
        [].concat(proof.pi_b[0].reverse(), proof.pi_b[1].reverse()) // G2 point, big-endian
    );
    const proofC = Buffer.from(proof.pi_c.slice(0, 64)); // G1 point
    const commitment = Buffer.from(publicSignals[0].slice(2), "hex"); // Hex to bytes

    // Submit transaction
    const tx = await program.methods
        .privateTransfer([...proofA], [...proofB], [...proofC], [...commitment])
        .accounts({
            state: statePda,
            user: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    console.log("Private transfer tx:", tx);
}

main().catch(console.error);
