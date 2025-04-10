using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace Levvy.CLI.Data.Types.Parameters;

public record CancelParameters(
    TransactionInput LockedUtxoOutref,
    TransactionInput ScriptOutref,
    RedeemerMap SpendRedeemer
);