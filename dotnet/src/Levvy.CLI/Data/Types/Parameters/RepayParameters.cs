using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace Levvy.CLI.Data.Types.Parameters;

public record RepayParameters(
    TransactionInput LockedUtxoOutref,
    TransactionInput ScriptOutref,
    RedeemerMap SpendRedeemer,
    Value RepayAmount,
    DatumOption Datum
);