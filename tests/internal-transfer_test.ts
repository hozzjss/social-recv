import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  getMemberBalance,
  depositTx,
  externalTransferTx,
  getSTXBalance,
  internalTransferTx,
  withdrawTx,
} from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make an internal transfer to other members",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    const contractName = deployer.address + ".social-recovery";

    const wallet2InitialSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_2.address
    );

    chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
      internalTransferTx(contractName, 500, wallet_1.address, wallet_2.address),
    ]);

    const wallet1InternalBalance = getMemberBalance(
      chain,
      contractName,
      wallet_1.address
    );

    assertEquals(wallet1InternalBalance, types.uint(500));

    const wallet2InternalBalance = getMemberBalance(
      chain,
      contractName,
      wallet_2.address
    );

    const wallet2FinalSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_2.address
    );

    // STX balance should be unchanged
    assertEquals(wallet2FinalSTXBalance, wallet2InitialSTXBalance);

    assertEquals(wallet2InternalBalance, types.uint(500));
  },
});
