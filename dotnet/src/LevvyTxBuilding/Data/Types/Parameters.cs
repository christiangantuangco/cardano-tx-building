using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace LevvyTxBuilding.Data.Types;

public record LendParameters(
    Value Amount,
    DatumOption LendDatum
);

public record CancelParameters(
    TransactionInput LockedUtxoOutref,
    TransactionInput ScriptOutref,
    RedeemerMap SpendRedeemer,
    RedeemerMap WithdrawRedeemer,
    Value PlatformAmount
);