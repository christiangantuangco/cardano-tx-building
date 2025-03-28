using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace CardanoTxBuilding;

public record CancelParameter(
    TransactionInput LockedUtxoOutRef,
    TransactionInput ScriptRefUtxoOutref,
    RedeemerMap Redeemer, Value MainAmount,
    Value FeeAmount, Value ChangeAmount,
    ulong WithdrawalAmount,
    RedeemerMap WithdrawRedeemer
);