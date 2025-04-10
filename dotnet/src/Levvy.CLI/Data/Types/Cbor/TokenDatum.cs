using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;

namespace Levvy.CLI.Data.Types.Cbor;

[CborSerializable]
[CborUnion]
public abstract partial record TokenDatum : CborBase;

[CborSerializable]
[CborConstr(0)]
public partial record LendTokenDatum(LendTokenDetails LendTokenDetails) : TokenDatum;

[CborSerializable]
[CborConstr(1)]
public partial record BorrowTokenDatum(BorrowTokenDetails BorrowTokenDetails) : TokenDatum;

[CborSerializable]
[CborConstr(2)]
public partial record RepayTokenDatum(RepayTokenDetails RepayTokenDetails) : TokenDatum;