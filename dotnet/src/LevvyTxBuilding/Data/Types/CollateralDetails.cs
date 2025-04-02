using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types;

[CborSerializable]
[CborConstr(0)]
public partial record CollateralDetails(
    string PolicyId,
    string AssetName,
    ulong CollateralAmount
) : CborBase;