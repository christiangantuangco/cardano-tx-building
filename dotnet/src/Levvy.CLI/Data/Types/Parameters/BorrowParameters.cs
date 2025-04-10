using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace Levvy.CLI.Data.Types.Parameters;

public record BorrowParameters(
    TransactionInput LockedUtxoOutref,
    TransactionInput ScriptOutref,
    TransactionInput CollateralOutref,
    RedeemerMap SpendRedeemer,
    Value TokenAmount,
    Value FeeAmount,
    DatumOption Datum,
    DatumOption PaymentDatum
);