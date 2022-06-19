import {
  Clarinet,
  Chain,
  Account,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  getMemberBalance,
  depositTx,
  ErrorCodes,
  getTestMeta,
} from "./util.ts";

Clarinet.test({
  name: "as any user i should be able to make a deposit to a member account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, nonMemberWallet, contractName } = getTestMeta(accounts);
    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
    ]);

    let result = block.receipts[0].result;
    result.expectOk().expectBool(true);
    assertEquals(block.receipts.length, 1);
    const balance = getMemberBalance(chain, contractName, wallet_1.address);

    balance.expectUint(1000);
  },
});

Clarinet.test({
  name: "Ensure that a member can't make a deposit to a non-member account",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, nonMemberWallet, contractName } = getTestMeta(accounts);

    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, nonMemberWallet.address),
    ]);
    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.NOT_MEMBER);
  },
});

Clarinet.test({
  name: "Ensure that a member can't make an invalid amount  deposit",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, nonMemberWallet, contractName } = getTestMeta(accounts);

    let block = chain.mineBlock([
      depositTx(contractName, 0, wallet_1.address, wallet_1.address),
    ]);
    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;
    result.expectErr().expectUint(ErrorCodes.INVALID_AMOUNT);
  },
});
