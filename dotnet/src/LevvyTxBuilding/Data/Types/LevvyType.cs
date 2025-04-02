using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types;

[CborSerializable]
[CborUnion]
public abstract partial record LevvyType : CborBase;

[CborSerializable]
[CborConstr(0)]
public partial record Tokens : LevvyType;

[CborSerializable]
[CborConstr(1)]
public partial record Nfts : LevvyType;