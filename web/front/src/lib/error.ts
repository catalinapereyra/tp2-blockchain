export function getErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const msg = e.message;
  if (
    msg.includes("user rejected") ||
    msg.includes("User denied") ||
    msg.includes("ACTION_REJECTED")
  ) {
    return "Cancelaste la operación en MetaMask.";
  }
  // ethers revert reason
  const revertMatch = msg.match(/reason="([^"]+)"/);
  if (revertMatch) return revertMatch[1];
  return msg;
}
