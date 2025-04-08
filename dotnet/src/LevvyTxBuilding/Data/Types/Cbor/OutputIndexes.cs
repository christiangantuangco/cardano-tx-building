using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types.Cbor;

[CborSerializable]
[CborConstr(0)]
public partial record OutputIndexes(
    ulong SelfOutputIndex,
    Option<ulong> FeeOutputIndex,
    Option<ulong> ChangeIndex
) : CborBase;