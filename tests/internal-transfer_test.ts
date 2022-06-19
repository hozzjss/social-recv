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
  getSTXBalance,
  internalTransferTx,
  ErrorCodes,
  getTestMeta,
} from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make an internal transfer to other members",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);

    const wallet2InitialSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_2.address
    );

    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
      internalTransferTx(contractName, 500, wallet_1.address, wallet_2.address),
    ]);

    block.receipts[0].events.expectSTXTransferEvent(
      1000,
      wallet_1.address,
      contractName
    );

    let result = block.receipts[0].result;

    result.expectOk().expectBool(true);

    result = block.receipts[1].result;

    result.expectOk().expectBool(true);

    const wallet1InternalBalance = getMemberBalance(
      chain,
      contractName,
      wallet_1.address
    );

    wallet1InternalBalance.expectUint(500);

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

    wallet2InternalBalance.expectUint(500);
  },
});

Clarinet.test({
  name: "Ensure that a member can only transfer if they have sufficient funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);
    let block = chain.mineBlock([
      internalTransferTx(
        contractName,
        1000,
        wallet_1.address,
        wallet_2.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.INSUFFICIENT_FUNDS);
  },
});

Clarinet.test({
  name: "Ensure that only members can transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);
    let block = chain.mineBlock([
      internalTransferTx(
        contractName,
        1000,
        nonMemberWallet.address,
        wallet_2.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.NOT_MEMBER);
  },
});

Clarinet.test({
  name: "Ensure that only a positive non-zero amount can be transferred",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, contractName } = getTestMeta(accounts);
    let block = chain.mineBlock([
      internalTransferTx(contractName, 0, wallet_1.address, wallet_2.address),
    ]);

    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INVALID_AMOUNT)));
  },
});
