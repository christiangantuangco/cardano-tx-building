using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types.Cbor;

[CborSerializable]
[CborConstr(0)]
public partial record OutputReference(
    byte[] TransactionId,
    ulong OutputIndex
) : CborBase;