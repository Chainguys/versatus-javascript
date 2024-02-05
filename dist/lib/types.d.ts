import { AddressOrNamespace, StatusValue } from './classes/utils';
import { ApprovalsExtend, ApprovalsInsert, ApprovalsRemove, ApprovalsRevoke, ApprovalsValue } from './classes/Approvals';
import { TokenDataExtend, TokenDataInsert, TokenDataRemove, TokenDataValue, TokenIdExtend, TokenIdInsert, TokenIdPop, TokenIdPush, TokenIdValue, TokenMetadataExtend, TokenMetadataInsert, TokenMetadataRemove, TokenMetadataValue } from './classes/Token';
export type AccountType = 'user' | {
    Program: Address;
};
/**
 * Represents a 20-byte Ethereum Compatible address.
 *
 * This structure is used to store Ethereum Compatible addresses, which are derived from the public key. It implements traits like Clone, Copy, Debug, Serialize, Deserialize, etc., for ease of use across various contexts.
 */
export type Address = string;
export type U256 = [number, number, number, number];
export type Status = 'locked' | 'free';
export type TransactionType = {
    [k: string]: unknown;
};
/**
 * This file contains types the protocol uses to prepare data, structure it and call out to a particular compute payload. The inputs type for a contract call
 */
export interface ComputeInputs {
    accountInfo?: Account | null;
    contractInputs: string;
    op: string;
    transaction: Transaction;
    version: number;
    [k: string]: unknown;
}
/**
 * Represents an LASR account.
 *
 * This structure contains details of an LASR account, including its address, associated programs, nonce, signatures, hashes, and certificates. It implements traits for serialization, hashing, and comparison.
 */
export interface Account {
    accountType: AccountType;
    nonce: U256;
    ownerAddress: Address;
    programAccountData: ArbitraryData;
    programAccountLinkedPrograms: AddressOrNamespace[];
    programAccountMetadata: Metadata;
    programNamespace?: AddressOrNamespace | null;
    programs: {
        [k: string]: Token;
    };
    [k: string]: unknown;
}
/**
 * Represents a generic data container.
 *
 * This structure is used to store arbitrary data as a vector of bytes (`Vec<u8>`). It provides a default, cloneable, serializable, and debuggable interface. It is typically used for storing data that doesn't have a fixed format or structure.
 */
export interface ArbitraryData {
    [k: string]: string;
}
/**
 * Represents metadata as a byte vector.
 *
 * This structure is designed to encapsulate metadata, stored as a vector of bytes. It supports cloning, serialization, and debugging. The metadata can be of any form that fits into a byte array, making it a flexible container.
 */
export interface Metadata {
    [k: string]: string;
}
export type TokenFieldValues = 'approvals' | 'balance' | 'data' | 'metadata' | 'ownerId' | 'programId' | 'status' | 'tokenIds';
export type TokenUpdateValueTypes = TokenDataValue | TokenDataInsert | TokenDataExtend | TokenDataRemove | TokenMetadataValue | TokenMetadataInsert | TokenMetadataExtend | TokenMetadataRemove | TokenIdValue | TokenIdPush | TokenIdExtend | TokenIdInsert | TokenIdPop | StatusValue | ApprovalsValue | ApprovalsInsert | ApprovalsExtend | ApprovalsRemove | ApprovalsRevoke;
export interface Token {
    allowance: {
        [k: string]: U256;
    };
    approvals: {
        [k: string]: U256[];
    };
    balance: U256;
    data: ArbitraryData;
    metadata: Metadata;
    ownerId: Address;
    programId: Address;
    status: Status;
    tokenIds: U256[];
    [k: string]: unknown;
}
export interface InitTransaction {
    to: string;
    from: string;
    transactionInputs: string;
    nonce: string;
    op: string;
    programId: string;
    transactionType: TransactionType;
    value: string;
    [k: string]: unknown;
}
export interface Transaction extends InitTransaction {
    r: string;
    s: string;
    v: number;
}
export type InstructionKinds = 'create' | 'update' | 'transfer' | 'burn';
export type KeyPairArray = KeyPair[];
export interface KeyPair {
    mnemonic: string;
    keypair: string;
    secret_key: string;
    public_key: string;
    address: string;
}
