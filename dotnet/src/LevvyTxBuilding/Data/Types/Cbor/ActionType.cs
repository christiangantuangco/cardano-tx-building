using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace LevvyTxBuilding.Data.Types.Cbor;

[CborSerializable]
[CborUnion]
public abstract partial record ActionType : CborBase;

[CborSerializable]
[CborConstr(0)]
public partial record Borrow(LevvyType LevvyType) : ActionType;

[CborSerializable]
[CborConstr(1)]
public partial record Repay(LevvyType LevvyType) : ActionType;

[CborSerializable]
[CborConstr(2)]
public partial record Foreclose(LevvyType LevvyType) : ActionType;

[CborSerializable]
[CborConstr(3)]
public partial record Cancel(LevvyType LevvyType) : ActionType;