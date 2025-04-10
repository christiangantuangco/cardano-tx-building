using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;

namespace Levvy.CLI.Data.Types.Cbor;

[CborSerializable]
[CborConstr(0)]
public partial record RepayTokenDetails(
  Address AdaOwner,
  ulong TokenAmount,
  ulong LoanAmount,
  ulong InterestAmount,
  OutputReference OutputReference
) : CborBase;