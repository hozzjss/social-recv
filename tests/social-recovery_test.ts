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
  getTestMeta,
  ErrorCodes,
  ACCOUNT_LOCK_BT,
  ACCOUNT_LOCKING_COOL_DOWN_BT,
} from "./util.ts";
// import * as mod from "https://deno.land/std@0.76.0/node/buffer.ts";

export const markAsLost = (
  contractName: string,
  lostAccount: string,
  newOwner: string,
  sender: string
) => {
  return Tx.contractCall(
    contractName,
    "mark-as-lost",
    [`'${lostAccount}`, `'${newOwner}`],
    sender
  );
};

export const getAccountUnlockTime = (
  chain: Chain,
  contractName: string,
  lostAccount: string
) => {
  return chain.callReadOnlyFn(
    contractName,
    "get-unlock-time",
    [`'${lostAccount}`],
    lostAccount
  );
};

export const getLockingCoolDown = (
  chain: Chain,
  contractName: string,
  member: string
) => {
  return chain.callReadOnlyFn(
    contractName,
    "get-locking-cool-down",
    [`'${member}`],
    member
  );
};

Clarinet.test({
  name: `
  . as a member i should be able to mark an account as lost and provide a new owner principal
    - this would mark the account as inaccessible for 200 blocks until the recovery request is fulfilled or rejected
    - this would also restrict the member who marked the account 
      as lost from marking any other account as lost for 2000 blocks
    - 200 blocks so that if the account was stolen the thief wouldn't be able to access it
    - 2000 blocks so that if a member was acting maliciously 
      and wanted to lock everyone out of their account, they wouldn't be able to do so for 2000 blocks
      these numbers are open to change`,
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      wallet_1,
      wallet_2: lockedAccount,
      wallet_3: dissenter,
      nonMemberWallet,
      contractName,
      newOwnerWallet,
    } = getTestMeta(accounts);

    // deposit funds initially to locked account
    let block = chain.mineBlock([
      depositTx(
        contractName,
        1000,
        lockedAccount.address,
        lockedAccount.address
      ),
    ]);

    const [depositResult] = block.receipts;

    depositResult.events.expectSTXTransferEvent(
      1000,
      lockedAccount.address,
      contractName
    );

    assertEquals(block.receipts.length, 1);

    depositResult.result.expectOk().expectBool(true);

    // mark locked account address as lost and expect an ok true
    block = chain.mineBlock([
      markAsLost(
        contractName,
        lockedAccount.address,
        newOwnerWallet.address,
        wallet_1.address
      ),
    ]);
    let result = block.receipts[0].result;
    result.expectOk().expectBool(true);

    // make any transaction from the locked account and expect an account locked error

    block = chain.mineBlock([
      withdrawTx(contractName, 200, lockedAccount.address),
      externalTransferTx(
        contractName,
        200,
        lockedAccount.address,
        nonMemberWallet.address
      ),
      internalTransferTx(
        contractName,
        200,
        lockedAccount.address,
        wallet_1.address
      ),
    ]);

    let results = block.receipts;

    results.forEach((txResult) => {
      txResult.result.expectErr().expectUint(ErrorCodes.ACCOUNT_LOCKED);

      assertEquals(txResult.events.length, 0);
    });

    block = chain.mineBlock([
      Tx.contractCall(
        contractName,
        "dissent",
        [`'${lockedAccount.address}`],
        dissenter.address
      ),
    ]);

    result = block.receipts[0].result;

    result.expectOk().expectBool(true);

    block = chain.mineBlock([
      withdrawTx(contractName, 200, lockedAccount.address),
      externalTransferTx(
        contractName,
        200,
        lockedAccount.address,
        nonMemberWallet.address
      ),
      internalTransferTx(
        contractName,
        200,
        lockedAccount.address,
        wallet_1.address
      ),
    ]);

    results = block.receipts;

    const [withdrawResult, externalTransferResult, internalTransferResult] =
      results;

    withdrawResult.events.expectSTXTransferEvent(
      200,
      contractName,
      lockedAccount.address
    );

    externalTransferResult.events.expectSTXTransferEvent(
      200,
      contractName,
      nonMemberWallet.address
    );

    results.forEach((txResult) => {
      txResult.result.expectOk().expectBool(true);
    });
  },
});

Clarinet.test({
  name: "todo",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      contractName,
      wallet_1,
      wallet_2: lockedAccount,
      nonMemberWallet,
      newOwnerWallet,
    } = getTestMeta(accounts);

    let block = chain.mineBlock([
      markAsLost(
        contractName,
        lockedAccount.address,
        newOwnerWallet.address,
        wallet_1.address
      ),
    ]);
    let result = block.receipts[0].result;
    result.expectOk().expectBool(true);

    // check that the account is locked for 200 future blocks

    const unlockTimeResult = getAccountUnlockTime(
      chain,
      contractName,
      lockedAccount.address
    );

    unlockTimeResult.result
      .expectSome()
      .expectUint(chain.blockHeight - 1 + ACCOUNT_LOCK_BT);

    const lockingCoolDownResult = getLockingCoolDown(
      chain,
      contractName,
      wallet_1.address
    );

    lockingCoolDownResult.result
      .expectSome()
      .expectUint(chain.blockHeight - 1 + ACCOUNT_LOCKING_COOL_DOWN_BT);

    // non members should not be able to mark an account as lost
    block = chain.mineBlock([
      markAsLost(
        contractName,
        lockedAccount.address,
        newOwnerWallet.address,
        nonMemberWallet.address
      ),
    ]);
    result = block.receipts[0].result;

    result.expectErr().expectUint(ErrorCodes.NOT_MEMBER);

    //
  },
});
