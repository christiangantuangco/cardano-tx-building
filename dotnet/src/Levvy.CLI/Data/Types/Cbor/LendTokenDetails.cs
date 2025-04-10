using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;

namespace Levvy.CLI.Data.Types.Cbor;

[CborSerializable]
[CborConstr(0)]
public partial record LendTokenDetails(
    Address AdaOwner,
    byte[] PolicyId,
    byte[] AssetName,
    ulong TokenAmount,
    ulong LoanAmount,
    ulong InterestAmount,
    ulong LoanDuration,
    OutputReference OutputReference
) : CborBase;