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
  return result.result;
};

const stringToBuffer = (str: string) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};

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
      Tx.contractCall(
        contractName,
        "deposit",
        [types.uint(1000), types.principal(wallet_1.address)],
        wallet_1.address
      ),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    const result = block.receipts[0].result;

    assertEquals(result, types.ok(types.bool(true)));

    const balance = getMemberBalance(chain, contractName, wallet_1.address);

    assertEquals(balance, types.uint(1000));

    const memo = stringToBuffer("send 100 uSTX to my pal");

    const memoHex = "0x" + mod.Buffer.from(memo).toString("hex");

    const wallet2InitialBalance = Number(
      getSTXBalance(chain, accounts, wallet_2.address)
        .replace("(ok u", "")
        .replace(")", "")
    );

    block = chain.mineBlock([
      Tx.contractCall(
        contractName,
        "transfer",
        [
          types.uint(100),
          types.principal(wallet_1.address),
          types.principal(wallet_2.address),
          types.some(types.buff(memo)),
        ],
        wallet_1.address
      ),
    ]);

    const printedResult = block.receipts[0].events[0];
    assertEquals(printedResult.contract_event.value, memoHex);
    const remainingBalance = getMemberBalance(
      chain,
      contractName,
      wallet_1.address
    );
    assertEquals(remainingBalance, types.uint(900));
    const wallet2NewBalance = getSTXBalance(chain, accounts, wallet_2.address);
    assertEquals(
      wallet2NewBalance,
      types.ok(types.uint(wallet2InitialBalance + 100))
    );

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);
  },
});
