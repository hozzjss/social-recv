import {
  Clarinet,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { depositTx, getSTXBalance, withdrawTx, ErrorCodes } from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make a withdrawal from my own account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    const nonMemberWallet = accounts.get("wallet_6")!;

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

    let result = block.receipts[0].result;

    assertEquals(result, types.ok(types.bool(true)));

    const wallet1FinalSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    assertEquals(wallet1FinalSTXBalance, wallet1InitialSTXBalance - 1000);

    block = chain.mineBlock([withdrawTx(contractName, 1000, wallet_1.address)]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);

    result = block.receipts[0].result;

    assertEquals(result, types.ok(types.bool(true)));

    const wallet1FinalSTXBalance2 = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    assertEquals(wallet1FinalSTXBalance2, wallet1InitialSTXBalance);

    block = chain.mineBlock([withdrawTx(contractName, 1000, wallet_1.address)]);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INSUFFICIENT_FUNDS)));

    block = chain.mineBlock([
      withdrawTx(contractName, 500, nonMemberWallet.address),
    ]);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.NOT_MEMBER)));

    block = chain.mineBlock([withdrawTx(contractName, 0, wallet_1.address)]);
    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INVALID_AMOUNT)));
  },
});