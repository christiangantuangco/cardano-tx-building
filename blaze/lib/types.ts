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

// Levvy Type
const Tokens = Data.to({ Tokens: Data.Object([]) }, LevvyType);
const Nfts = Data.to({ Nfts: Data.Object([]) }, LevvyType);

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
    OutputReference
}