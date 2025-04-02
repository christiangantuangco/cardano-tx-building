using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Plutus.Address;
using Chrysalis.Tx.Builders;
using Chrysalis.Tx.Providers;
using Address = Chrysalis.Wallet.Models.Addresses.Address;
using LevvyTxBuilding.Data.Types;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Serialization;

var provider = new Blockfrost("previewajMhMPYerz9Pd3GsqjayLwP5mgnNnZCC");
Address tanAddress = Address.FromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
Address validatorAddress = Address.FromBech32("addr_test1wqmglnv5j97jtl3ley6upj4g9q2cn5wc7ra9numaepa6taqch4ya9");

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

var transfer = TransactionTemplateBuilder<ulong>.Create(provider)
.AddStaticParty("tan", tanAddress.ToBech32(), true)
.AddStaticParty("validator", validatorAddress.ToBech32())
.AddInput((options, amount) =>
{
    options.From = "tan";
})
.AddOutput((options, amount) =>
{
    options.To = "validator";
    options.Amount = new Lovelace(amount); // @TODO calculate fee helper function
    options.Datum = new InlineDatumOption(1, new(lendDetailsBytes));
})
.Build();
