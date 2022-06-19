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
} from "./util.ts";
// import * as mod from "https://deno.land/std@0.76.0/node/buffer.ts";

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
    const { wallet_1, wallet_2, nonMemberWallet, contractName } =
      getTestMeta(accounts);
  },
});
