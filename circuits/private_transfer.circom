pragma circom 2.0.8;
include "node_modules/circomlib/circuits/poseidon.circom";

template PrivateTransfer() {
    signal input amount;      // Private: amount to transfer
    signal input blinding;    // Private: random blinding factor
    signal input commitment;  // Public: Poseidon(amount, blinding)
    signal output valid;      // Public: proof validity

    // Compute Poseidon hash
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== amount;
    poseidon.inputs[1] <== blinding;
    poseidon.out === commitment;

    // Dummy output to confirm validity
    valid <== 1;
}

component main {public [commitment]} = PrivateTransfer();
