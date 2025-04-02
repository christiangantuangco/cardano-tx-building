using Chrysalis.Cbor.Serialization;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;
using LevvyTxBuilding.Data.Types;

LendDetails lendDetails = new(
    Lender: new(
        PaymentCredential: new VerificationKey(Convert.FromHexString("8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d")),
        StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(Convert.FromHexString("f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c"))))
    ),
    CollateralDetails: new(
        "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
        "434e4354",
        6000
    ),
    LoanAmount: 5000000,
    InterestAmount: 3000000,
    LoanDuration: 76900000,
    LevvyType: new Tokens()
);

byte[] lendDetailsBytes = CborSerializer.Serialize(lendDetails);
Console.WriteLine(Convert.ToHexString(lendDetailsBytes));