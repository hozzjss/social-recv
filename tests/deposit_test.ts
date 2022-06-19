import {
  Clarinet,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { getMemberBalance, depositTx, ErrorCodes } from "./util.ts";

Clarinet.test({
  name: "as any user i should be able to make a deposit to a member account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const nonMemberWallet = accounts.get("wallet_6")!;
    const contractName = deployer.address + ".social-recovery";
    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    const balance = getMemberBalance(chain, contractName, wallet_1.address);

    assertEquals(balance, types.uint(1000));

    block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, nonMemberWallet.address),
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);

    let result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.NOT_MEMBER)));

    block = chain.mineBlock([
      depositTx(contractName, 0, wallet_1.address, wallet_1.address),
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 4);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INVALID_AMOUNT)));
  },
});
