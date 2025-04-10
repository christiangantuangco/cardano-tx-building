using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;

namespace Levvy.CLI.Data.Types.Cbor;

[CborSerializable]
[CborConstr(0)]
public partial record BorrowTokenDetails(
  Address AdaOwner,
  Address AssetOwner,
  byte[] PolicyId,
  byte[] AssetName,
  ulong TokenAmount,
  ulong LoanAmount,
  ulong InterestAmount,
  ulong LoanEndTime,
  OutputReference OutputReference
) : CborBase;