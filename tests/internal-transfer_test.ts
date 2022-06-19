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

    let result = block.receipts[0].result;

    assertEquals(result, types.ok(types.bool(true)));

    result = block.receipts[1].result;

    assertEquals(result, types.ok(types.bool(true)));

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

    block = chain.mineBlock([
      internalTransferTx(
        contractName,
        1000,
        wallet_1.address,
        wallet_2.address
      ),
    ]);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INSUFFICIENT_FUNDS)));

    block = chain.mineBlock([
      internalTransferTx(
        contractName,
        500,
        nonMemberWallet.address,
        wallet_1.address
      ),
    ]);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.NOT_MEMBER)));

    block = chain.mineBlock([
      internalTransferTx(contractName, 0, wallet_1.address, wallet_1.address),
    ]);

    result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.INVALID_AMOUNT)));
  },
});
