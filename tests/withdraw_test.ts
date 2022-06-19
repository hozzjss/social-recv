import {
  Clarinet,
  Chain,
  Account,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { depositTx, getSTXBalance, withdrawTx } from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make a withdrawal from my own account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    const contractName = deployer.address + ".social-recovery";

    const wallet1InitialSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    const wallet1FinalSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    assertEquals(wallet1FinalSTXBalance, wallet1InitialSTXBalance - 1000);

    block = chain.mineBlock([withdrawTx(contractName, 1000, wallet_1.address)]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);

    const wallet1FinalSTXBalance2 = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    assertEquals(wallet1FinalSTXBalance2, wallet1InitialSTXBalance);
  },
});
