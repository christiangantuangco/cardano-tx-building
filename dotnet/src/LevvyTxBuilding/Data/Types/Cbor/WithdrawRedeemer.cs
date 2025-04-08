using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types.Cbor;

[CborSerializable]
[CborList]
public partial record WithdrawRedeemer(
    Action Action
) : CborBase;