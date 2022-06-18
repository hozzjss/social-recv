import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
// import * as mod from "https://deno.land/std@0.76.0/node/buffer.ts";

const ErrorCodes = {
  NOT_MEMBER: 1001,
  NOT_AUTHORIZED: 1002,
  INSUFFICIENT_FUNDS: 2001,
};

const getMemberBalance = (
  chain: Chain,
  contractName: string,
  address: string
) => {
  const result = chain.callReadOnlyFn(
    contractName,
    "get-balance",
    [types.principal(address)],
    address
  );
  return result.result;
};

const depositTx = (
  contractName: string,
  amount: number,
  sender: string,
  recipient: string
) => {
  return Tx.contractCall(
    contractName,
    "deposit",
    [types.uint(amount), types.principal(recipient)],
    sender
  );
};

const externalTransferTx = (
  contractName: string,
  amount: number,
  sender: string,
  recipient: string,
  memo?: string
) => {
  return Tx.contractCall(
    contractName,
    "external-transfer",
    [
      types.uint(amount),
      types.principal(sender),
      types.principal(recipient),
      memo ? types.some(types.buff(stringToBuffer(memo))) : types.none(),
    ],
    sender
  );
};

const internalTransferTx = (
  contractName: string,
  amount: number,
  sender: string,
  recipient: string,
  memo?: string
) => {
  return Tx.contractCall(
    contractName,
    "internal-transfer",
    [
      types.uint(amount),
      types.principal(sender),
      types.principal(recipient),
      memo ? types.some(types.buff(stringToBuffer(memo))) : types.none(),
    ],
    sender
  );
};

const withdrawTx = (contractName: string, amount: number, sender: string) => {
  return Tx.contractCall(
    contractName,
    "withdraw",
    [types.uint(amount), types.principal(sender)],
    sender
  );
};

const getSTXBalance = (
  chain: Chain,
  accounts: Map<string, Account>,
  address: string
) => {
  const deployer = accounts.get("deployer")!;
  const wstxContractName = deployer.address + ".wstx";
  const result = chain.callReadOnlyFn(
    wstxContractName,
    "get-balance",
    [types.principal(address)],
    address
  );
  const cleanBalance = result.result.replace("(ok u", "").replace(")", "");
  return Number(cleanBalance);
};

const stringToBuffer = (str: string) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};
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

    const result = block.receipts[0].result;

    assertEquals(result, types.err(types.uint(ErrorCodes.NOT_MEMBER)));
  },
});

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

Clarinet.test({
  name: "as a member i should be able to make an external transfer to someone else",
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
      externalTransferTx(contractName, 500, wallet_1.address, wallet_2.address),
    ]);

    const wallet1InternalBalance = getMemberBalance(
      chain,
      contractName,
      wallet_1.address
    );

    assertEquals(wallet1InternalBalance, types.uint(500));

    const wallet2FinalSTXBalance = getSTXBalance(
      chain,
      accounts,
      wallet_2.address
    );

    // STX balance should be unchanged
    assertEquals(wallet2FinalSTXBalance, wallet2InitialSTXBalance + 500);
  },
});
