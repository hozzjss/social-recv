import {
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";

export const ErrorCodes = {
  NOT_MEMBER: 1001,
  NOT_AUTHORIZED: 1002,
  ACCOUNT_LOCKED: 1003,
  LOCKING_UNAVAILABLE: 1004,
  ALREADY_LOCKED: 1005,
  ALREADY_A_MEMBER: 1006,
  INSUFFICIENT_FUNDS: 2001,
  INVALID_AMOUNT: 2002,
  DISSENT_EXPIRED: 3001,
  DISSENT_ACTIVE: 3002,
};

// BT = Block time
export const ACCOUNT_LOCK_BT = 200;

export const ACCOUNT_LOCKING_COOL_DOWN_BT = 2000;

export const getMemberBalance = (
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

export const depositTx = (
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

export const externalTransferTx = (
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

export const internalTransferTx = (
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

export const withdrawTx = (
  contractName: string,
  amount: number,
  sender: string
) => {
  return Tx.contractCall(
    contractName,
    "withdraw",
    [types.uint(amount), types.principal(sender)],
    sender
  );
};

export const getSTXBalance = (
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

export const stringToBuffer = (str: string) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};

export const getTestMeta = (accounts: Map<string, Account>) => {
  const deployer = accounts.get("deployer")!;
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;
  const wallet_3 = accounts.get("wallet_3")!;
  const wallet_4 = accounts.get("wallet_4")!;
  const wallet_5 = accounts.get("wallet_5")!;
  const newOwnerWallet = accounts.get("wallet_6")!;
  const nonMemberWallet = accounts.get("wallet_9")!;
  const contractName = deployer.address + ".social-recovery";

  return {
    deployer,
    wallet_1,
    wallet_2,
    wallet_3,
    wallet_4,
    wallet_5,
    newOwnerWallet,
    nonMemberWallet,
    contractName,
  };
};

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

export const isAccountUnlocked = (
  chain: Chain,
  contractName: string,
  lostAccount: string
) => {
  return chain.callReadOnlyFn(
    contractName,
    "is-account-unlocked?",
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

export const dissent = (
  contractName: string,
  member: string,
  sender: string
) => {
  return Tx.contractCall(contractName, "dissent", [`'${member}`], sender);
};

export const executeRecovery = (
  contractName: string,
  member: string,
  sender: string
) => {
  return Tx.contractCall(
    contractName,
    "execute-recovery",
    [`'${member}`],
    sender
  );
};

export const getMemberData = (
  chain: Chain,
  contractName: string,
  member: string
) => {
  return chain.callReadOnlyFn(
    contractName,
    "get-member",
    [`'${member}`],
    member
  );
};
