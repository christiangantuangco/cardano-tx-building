using Action = CardanoTxBuilding.Data.Enums.Action;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace CardanoTxBuilding;

public record SwapParameters(
    TransactionInput LockedUtxoOutRef,
    TransactionInput ScriptRefUtxoOutref,
    RedeemerMap SpendRedeemer,
    Value MainAmount,
    Value ChangeAmount,
    Value FeeAmount,
    ulong WithdrawalAmount,
    Action Action = Action.Swap
);

public record CancelParameters(
    TransactionInput LockedUtxoOutRef,
    TransactionInput ScriptRefUtxoOutref,
    RedeemerMap SpendRedeemer,
    Value MainAmount,
    Value FeeAmount,
    ulong WithdrawalAmount,
    RedeemerMap WithdrawRedeemer,
    Action Action = Action.Cancel
);