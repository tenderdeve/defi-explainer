/**
 * Canonical message a wallet signs to prove ownership of its address.
 *
 * Pure string builder — no Node crypto — so both the server (verify route) and
 * the client hook derive the exact same text from {address, nonce}. The client
 * never sends the message text; the server rebuilds it, guaranteeing the signed
 * payload is the one we expect.
 */
export function buildSignMessage(address: string, nonce: string): string {
  return [
    "Lucid — verify wallet ownership",
    "",
    "Sign this message to access your encrypted API keys.",
    "This is free and does not create a transaction.",
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}
