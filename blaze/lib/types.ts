import { Data } from "@blaze-cardano/sdk";
import {
    LevvyType,
    OutputIndexes,
    ActionType,
    Action,
    WithdrawRedeemer,
    CollateralDetails,
    DatumCredential,
    DatumAddress,
    LendDetails,
    BorrowDetails,
    LevvyDatum,
    TokenDetails,
    OutputReference
} from "./schema";
import { Address } from "@blaze-cardano/core";

// Levvy Type
const Tokens = Data.to({ Tokens: Data.Object([]) }, LevvyType);
const Nfts = Data.to({ Nfts: Data.Object([]) }, LevvyType);

type Collateral = {
    policyId: string,
    assetName: string,
    amount: bigint,
}

type LoanInput = {
    lender: Address,
    amount: bigint,
    interestAmount: bigint,
    duration: bigint,
    collateral: Collateral
}

export {
    Tokens,
    Nfts,
    LevvyType,
    OutputIndexes,
    ActionType,
    Action,
    WithdrawRedeemer,
    CollateralDetails,
    DatumCredential,
    DatumAddress,
    LendDetails,
    BorrowDetails,
    LevvyDatum,
    TokenDetails,
    OutputReference,
    LoanInput
}