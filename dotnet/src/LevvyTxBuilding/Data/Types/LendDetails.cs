using Chrysalis.Cbor.Serialization.Attributes;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;

namespace LevvyTxBuilding.Data.Types;

[CborSerializable]
[CborConstr(0)]
public partial record LendDetails(
    Address Lender,
    CollateralDetails CollateralDetails,
    ulong LoanAmount,
    ulong InterestAmount,
    ulong LoanDuration,
    LevvyType LevvyType
) : CborBase;