import {
  Clarinet,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  depositTx,
  getSTXBalance,
  withdrawTx,
  ErrorCodes,
  getTestMeta,
} from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make a withdrawal from my own account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, nonMemberWallet, contractName } = getTestMeta(accounts);

    const wallet1InitialSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_1.address
    );

    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
    ]);

    block.receipts[0].events.expectSTXTransferEvent(
      1000,
      wallet_1.address,
      contractName
    );

    let result = block.receipts[0].result;

    result.expectOk().expectBool(true);

    block = chain.mineBlock([withdrawTx(contractName, 1000, wallet_1.address)]);

    block.receipts[0].events.expectSTXTransferEvent(
      1000,
      contractName,
      wallet_1.address
    );

    result = block.receipts[0].result;

    result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that only members can withdraw",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { nonMemberWallet, contractName } = getTestMeta(accounts);

    let block = chain.mineBlock([
      withdrawTx(contractName, 500, nonMemberWallet.address),
    ]);

    let result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.NOT_MEMBER);
  },
});

Clarinet.test({
  name: "Ensure that only a positive non-zero amount can be withdrawn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractName, wallet_1 } = getTestMeta(accounts);

    let block = chain.mineBlock([
      withdrawTx(contractName, 0, wallet_1.address),
    ]);

    let result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INVALID_AMOUNT)));
  },
});

Clarinet.test({
  name: "Ensure that a member can only withdraw if they have sufficient funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractName, wallet_1 } = getTestMeta(accounts);

    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
    ]);

    let result = block.receipts[0].result;

    result.expectOk().expectBool(true);

    block = chain.mineBlock([withdrawTx(contractName, 1500, wallet_1.address)]);

    result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.INSUFFICIENT_FUNDS);
  },
});
