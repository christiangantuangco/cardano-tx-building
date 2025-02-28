import { Data, Static } from "@blaze-cardano/sdk";

const LevvyTypeSchema = Data.Enum([
    Data.Object({ Tokens: Data.Object([]) }),
    Data.Object({ Nfts: Data.Object([]) })
]);
type LevvyType = Static<typeof LevvyTypeSchema>
const LevvyType = LevvyTypeSchema as unknown as LevvyType;

const OutputIndexesSchema = Data.Object({
    selfOutputIndex: Data.Integer(),
    feeOutputIndex: Data.Nullable(Data.Integer()),
    changeIndex: Data.Nullable(Data.Integer()),
});
type OutputIndexes = Static<typeof OutputIndexesSchema>;
const OutputIndexes = OutputIndexesSchema as unknown as OutputIndexes;

const ActionTypeSchema = Data.Enum([
    Data.Object({ BorrowAction: Data.Object({ type: LevvyType }) }),
    Data.Object({ RepayAction: Data.Object({ type: LevvyType }) }),
    Data.Object({ ForecloseAction: Data.Object({ type: LevvyType}) }),
    Data.Object({ CancelAction: Data.Object({ type: LevvyType }) }),
]);
type ActionType = Static<typeof ActionTypeSchema>;
const ActionType = ActionTypeSchema as unknown as ActionType;

const ActionSchema = Data.Object({
    inputIndex: Data.Integer(),
    outputIndexes: OutputIndexes,
    actionType: ActionType,
})
type Action = Static<typeof ActionSchema>;
const Action = ActionSchema as unknown as ActionType;

const WithdrawRedeemerSchema = Data.Array(Action);
type WithdrawRedeemer = Static<typeof WithdrawRedeemerSchema>;
const WithdrawRedeemer = WithdrawRedeemerSchema as unknown as WithdrawRedeemer;

const CollateralDetailsSchema = Data.Object({
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
    collateralAmount: Data.Integer(),
});
type CollateralDetails = Static<typeof CollateralDetailsSchema>;
const CollateralDetails = CollateralDetailsSchema as unknown as CollateralDetails;

const DatumCredentialSchema = Data.Object({
    keyHash: Data.Bytes()
})
type DatumCredential = Static<typeof DatumCredentialSchema>;
const DatumCredential = DatumCredentialSchema as unknown as DatumCredential;

const DatumAddressSchema = Data.Object({
    paymentCredential: DatumCredential,
    stakeCredential: Data.Nullable(DatumCredential)
});
type DatumAddress = Static<typeof DatumAddressSchema>;
const DatumAddress = DatumAddressSchema as unknown as DatumAddress;

const LendDetailsSchema = Data.Object({
    lender: DatumAddress,
    collateralDetails: CollateralDetails,
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanDuration: Data.Integer(),
    levvyType: LevvyType,
});
type LendDetails = Static<typeof LendDetailsSchema>;
const LendDetails = LendDetailsSchema as unknown as LendDetails;

const BorrowDetailsSchema = Data.Object({
    lender: DatumAddress,
    borrower: DatumAddress,
    collateralDetails: CollateralDetails,
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanEndTime: Data.Integer(),
    levvyType: LevvyType,
    tag: Data.Bytes(),
});
type BorrowDetails = Static<typeof BorrowDetailsSchema>;
const BorrowDetails = BorrowDetailsSchema as unknown as BorrowDetails;

const LevvyDatumSchema = Data.Enum([
    Data.Object({ LendDatum: Data.Object({ lendDetails: LendDetails }) }),
    Data.Object({ BorrowDatum: Data.Object({ borrowDetails: BorrowDetails }) })
]);
type LevvyDatum = Static<typeof LevvyDatumSchema>;
const LevvyDatum = LevvyDatumSchema as unknown as LevvyDatum;

const TokenDetailsSchema = Data.Object({
    policy_id: Data.Bytes(),
    asset_name: Data.Bytes(),
    amount: Data.Integer(),
});
type TokenDetails = Static<typeof TokenDetailsSchema>;
const TokenDetails = TokenDetailsSchema as unknown as TokenDetails;

const OutputReferenceSchema = Data.Object({
    transaction_id: Data.Bytes(),
    output_index: Data.Integer(),
});
type OutputReference = Static<typeof OutputReferenceSchema>;
const OutputReference = OutputReferenceSchema as unknown as OutputReference;

export {
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