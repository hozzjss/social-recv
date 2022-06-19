import {
  Clarinet,
  Chain,
  Account,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  getMemberBalance,
  depositTx,
  externalTransferTx,
  getSTXBalance,
  ErrorCodes,
  getTestMeta,
} from "./util.ts";

Clarinet.test({
  name: "as a member i should be able to make an external transfer to someone else",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);
    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address, wallet_1.address),
      externalTransferTx(contractName, 500, wallet_1.address, wallet_2.address),
    ]);

    const [depositResult, externalTransferResult] = block.receipts;

    depositResult.events.expectSTXTransferEvent(
      1000,
      wallet_1.address,
      contractName
    );

    externalTransferResult.events.expectSTXTransferEvent(
      500,
      contractName,
      wallet_2.address
    );

    assertEquals(block.receipts.length, 2);

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
  },
});

Clarinet.test({
  name: "Ensure that a member can only transfer if they have sufficient funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);
    let block = chain.mineBlock([
      externalTransferTx(
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
    const { wallet_1, nonMemberWallet, contractName } = getTestMeta(accounts);

    let block = chain.mineBlock([
      externalTransferTx(
        contractName,
        500,
        nonMemberWallet.address,
        wallet_1.address
      ),
    ]);

    let result = block.receipts[0].result;

    assertEquals(block.receipts.length, 1);

    result.expectErr().expectUint(ErrorCodes.NOT_MEMBER);
  },
});

Clarinet.test({
  name: "Ensure that only a positive non-zero amount can be transferred",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractName, wallet_1, wallet_2 } = getTestMeta(accounts);
    let block = chain.mineBlock([
      externalTransferTx(contractName, 0, wallet_1.address, wallet_2.address),
    ]);

    assertEquals(block.receipts.length, 1);

    let result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.INVALID_AMOUNT);
  },
});
