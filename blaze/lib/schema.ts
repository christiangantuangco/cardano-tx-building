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
    stakeCredential: Data.Nullable(Data.Enum([
        Data.Object({ Inline: Data.Object({ credential: DatumCredential }) }),
        Data.Object({ Pointer: Data.Object([]) })
    ]))
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

const LevvyV2LendDetailsSchema = Data.Object({
    adaOwner: DatumAddress,
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
    tokenAmount: Data.Integer(),
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanDuration: Data.Integer(),
    outputReference: OutputReference,
});
type LevvyV2LendDetails = Static<typeof LevvyV2LendDetailsSchema>;
const LevvyV2LendDetails = LevvyV2LendDetailsSchema as unknown as LevvyV2LendDetails;

const LevvyV2BorrowDetailsSchema = Data.Object({
    adaOwner: DatumAddress,
    assetOwner: DatumAddress,
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
    tokenAmount: Data.Integer(),
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanEndTime: Data.Integer(),
    outputReference: OutputReference,
});
type LevvyV2BorrowDetails = Static<typeof LevvyV2BorrowDetailsSchema>;
const LevvyV2BorrowDetails = LevvyV2BorrowDetailsSchema as unknown as LevvyV2BorrowDetails;

const LevvyV2RepayDetailsSchema = Data.Object({
    adaOwner: DatumAddress,
    tokenAmount: Data.Integer(),
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    outputReference: OutputReference,
});
type LevvyV2RepayDetails = Static<typeof LevvyV2RepayDetailsSchema>;
const LevvyV2RepayDetails = LevvyV2RepayDetailsSchema as unknown as LevvyV2RepayDetails;

const LevvyV2TokenDatumSchema = Data.Enum([
    Data.Object({ LendTokenDatum: Data.Object({ lendTokenDetails: LevvyV2LendDetails }) }),
    Data.Object({ BorrowTokenDatum: Data.Object({ borrowTokenDetails: LevvyV2BorrowDetails }) }),
    Data.Object({ RepayTokenDatum: Data.Object({ repayTokenDetails: LevvyV2RepayDetails }) })
]);
type LevvyV2TokenDatum = Static<typeof LevvyV2TokenDatumSchema>;
const LevvyV2TokenDatum = LevvyV2TokenDatumSchema as unknown as LevvyV2TokenDatum;

const LevvyV2TokenActionSchema = Data.Enum([
    Data.Object({ BorrowTokenAction: Data.Object([]) }),
    Data.Object({ RepayTokenAction: Data.Object([]) }),
    Data.Object({ ClaimTokenAction: Data.Object([]) }),
    Data.Object({ ForecloseTokenAction: Data.Object([]) }),
    Data.Object({ CancelTokenAction: Data.Object([]) }),
]);
type LevvyV2TokenAction = Static<typeof LevvyV2TokenActionSchema>;
const LevvyV2TokenAction = LevvyV2TokenActionSchema as unknown as LevvyV2TokenAction;

const LevvyV2PaymentDatumSchema = Data.Object({
    outputReference: OutputReference,
});
type LevvyV2PaymentDatum = Static<typeof LevvyV2PaymentDatumSchema>;
const LevvyV2PaymentDatum = LevvyV2PaymentDatumSchema as unknown as LevvyV2PaymentDatum;

const TokenSwapDatumSchema = Data.Object({
    owner: DatumAddress,
    token: TokenDetails
});
type TokenSwapDatum = Static<typeof TokenSwapDatumSchema>;
const TokenSwapDatum = TokenSwapDatumSchema as unknown as TokenSwapDatum;

const AlwaysTrueActionSchema = Data.Enum([
    Data.Object({ Swap: Data.Object([]) }),
    Data.Object({ Cancel: Data.Object([]) })
]);
type AlwaysTrueAction = Static<typeof AlwaysTrueActionSchema>;
const AlwaysTrueAction = AlwaysTrueActionSchema as unknown as AlwaysTrueAction;

const AlwaysTrueIndexesSchema = Data.Object({
    inputIndex: Data.Integer(),
    outputIndex: Data.Nullable(Data.Integer()),
    feeIndex: Data.Integer()
});
type AlwaysTrueIndexes = Static<typeof AlwaysTrueIndexesSchema>;
const AlwaysTrueIndexes = AlwaysTrueIndexesSchema as unknown as AlwaysTrueIndexes;

const AlwaysTrueTupleSchema = Data.Tuple([
    AlwaysTrueAction,
    AlwaysTrueIndexes
]);
type AlwaysTrueTuple = Static<typeof AlwaysTrueTupleSchema>;
const AlwaysTrueTuple = AlwaysTrueTupleSchema as unknown as AlwaysTrueTuple;

const AlwaysTrueWithdrawRedeemerSchema = Data.Object({
    operation: Data.Array(AlwaysTrueTuple)
});
type AlwaysTrueWithdrawRedeemer = Static<typeof AlwaysTrueWithdrawRedeemerSchema>;
const AlwaysTrueWithdrawRedeemer = AlwaysTrueWithdrawRedeemerSchema as unknown as AlwaysTrueWithdrawRedeemer;

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
    OutputReference,
    TokenSwapDatum,
    AlwaysTrueAction,
    AlwaysTrueIndexes,
    AlwaysTrueTuple,
    AlwaysTrueWithdrawRedeemer,
    LevvyV2LendDetails,
    LevvyV2BorrowDetails,
    LevvyV2RepayDetails,
    LevvyV2TokenDatum,
    LevvyV2TokenAction,
    LevvyV2PaymentDatum
}
