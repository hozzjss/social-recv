import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import * as mod from "https://deno.land/std@0.76.0/node/buffer.ts";

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

const depositTx = (contractName: string, amount: number, sender: string) => {
  return Tx.contractCall(
    contractName,
    "deposit",
    [types.uint(amount), types.principal(sender)],
    sender
  );
};

const transferTx = (
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
  name: "as a member i should be able to make a deposit to my own account",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const contractName = deployer.address + ".social-recovery";
    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    const balance = getMemberBalance(chain, contractName, wallet_1.address);

    assertEquals(balance, types.uint(1000));
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
      depositTx(contractName, 1000, wallet_1.address),
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
  name: "Ensure that it can store and keep track of people's stx balances",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const wallet_3 = accounts.get("wallet_3")!;
    const wallet_4 = accounts.get("wallet_4")!;
    const wallet_5 = accounts.get("wallet_5")!;
    const contractName = deployer.address + ".social-recovery";
    let block = chain.mineBlock([
      depositTx(contractName, 1000, wallet_1.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    const result = block.receipts[0].result;

    assertEquals(result, types.ok(types.bool(true)));

    const balance = getMemberBalance(chain, contractName, wallet_1.address);

    assertEquals(balance, types.uint(1000));
    const wallet2InitialBalance = getSTXBalance(
      chain,
      accounts,
      wallet_2.address
    );

    block = chain.mineBlock([
      transferTx(contractName, 100, wallet_1.address, wallet_2.address),
    ]);
    const remainingBalance = getMemberBalance(
      chain,
      contractName,
      wallet_1.address
    );
    assertEquals(remainingBalance, types.uint(900));
    const wallet2NewBalance = getSTXBalance(chain, accounts, wallet_2.address);
    assertEquals(wallet2NewBalance, wallet2InitialBalance + 100);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);
  },
});
