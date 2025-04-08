using Chrysalis.Cbor.Types;
using Credential = Chrysalis.Cbor.Types.Plutus.Address.Credential;
using Chrysalis.Tx.Builders;
using Chrysalis.Tx.Providers;
using Address = Chrysalis.Wallet.Models.Addresses.Address;
using LevvyTxBuilding.Data.Types;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Serialization;
using LevvyTxBuilding.Data.Utils;
using Chrysalis.Tx.Extensions;
using Chrysalis.Wallet.Models.Keys;
using Chrysalis.Wallet.Words;
using Chrysalis.Wallet.Models.Enums;
using Transaction = Chrysalis.Cbor.Types.Cardano.Core.Transaction.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Plutus.Address;
using LevvyTxBuilding.Data.Types.Cbor;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;
using Chrysalis.Cbor.Types.Cardano.Core.Protocol;
using Chrysalis.Cbor.Types.Plutus;
using NSec.Cryptography;
using OutputReference = LevvyTxBuilding.Data.Types.Cbor.OutputReference;

string words = "lock drive scheme smooth staff gym laptop identify client pigeon annual run below boat perfect resource april laundry upset potato sorry inhale planet hedgehog";

Mnemonic mnemonic = Mnemonic.Restore(words, English.Words);
PrivateKey accountKey = mnemonic
            .GetRootKey()
            .Derive(PurposeType.Shelley, DerivationType.HARD)
            .Derive(CoinType.Ada, DerivationType.HARD)
            .Derive(0, DerivationType.HARD);
PrivateKey privateKey = accountKey
            .Derive(RoleType.ExternalChain)
            .Derive(0);

Blockfrost provider = new("previewajMhMPYerz9Pd3GsqjayLwP5mgnNnZCC");
Address tanAddress = Address.FromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
Address validatorAddress = Address.FromBech32("addr_test1wqmglnv5j97jtl3ley6upj4g9q2cn5wc7ra9numaepa6taqch4ya9");
Address platformAddress = Address.FromBech32("addr_test1qqzvkm7xa029v67d4w3ltxqrlxz8u0ltnuvrjkh5n0l4hlfsuwue24c9a3qphs5mahz63ksej5phq39p62v7k0nrd0fq4tzmaq");
Address withdrawalAddress = Address.FromBech32("stake_test17qmglnv5j97jtl3ley6upj4g9q2cn5wc7ra9numaepa6taqcltu20");

// await Lend();
await Borrow();
// await Cancel();

async Task Lend()
{
    LendDetails lendDetails = new(
        Lender: new(
            PaymentCredential: new VerificationKey(Convert.FromHexString("8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d")),
            StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(Convert.FromHexString("f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c"))))
        ),
        CollateralDetails: new(
            Convert.FromHexString("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
            Convert.FromHexString("434e4354"),
            6000
        ),
        LoanAmount: 5000000,
        InterestAmount: 3000000,
        LoanDuration: 76900000,
        LevvyType: new Tokens()
    );
    LendDatum lendDatum = new(lendDetails);
    byte[] lendDatumBytes = CborSerializer.Serialize(lendDatum);

    ulong platformFee = LevvyUtils.CalculatePlatformFee(lendDetails.InterestAmount, LevvyUtils.TOKEN_FEE_PERCENT);

    var lend = TransactionTemplateBuilder<LendParameters>.Create(provider)
    .AddStaticParty("tan", tanAddress.ToBech32(), true)
    .AddStaticParty("validator", validatorAddress.ToBech32())
    .AddInput((options, lendParams) =>
    {
        options.From = "tan";
    })
    .AddOutput((options, lendParams) =>
    {
        options.To = "validator";
        options.Amount = lendParams.Amount;
        options.Datum = lendParams.LendDatum;
    })
    .Build();

    LendParameters lendParams = new(
        Amount: new Lovelace(platformFee + lendDetails.LoanAmount),
        LendDatum: new InlineDatumOption(1, new(lendDatumBytes))
    );

    Transaction unsignedLendTx = await lend(lendParams);
    Transaction signedLendTx = unsignedLendTx.Sign(privateKey);
    string txCbor = Convert.ToHexString(CborSerializer.Serialize(signedLendTx));
    Console.WriteLine(txCbor);

    await Task.CompletedTask;
}

async Task Borrow()
{
    TransactionInput lockedUtxoOutRef = new(
        Convert.FromHexString("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
        0
    );

    ulong platformFee = LevvyUtils.CalculatePlatformFee(3_000_000, LevvyUtils.TOKEN_FEE_PERCENT);

    OutputReference outRef = new(
        Convert.FromHexString("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
        0
    );
    byte[] outRefBytes = CborSerializer.Serialize(outRef);

    Blake2b blake2b = HashAlgorithm.Blake2b_256;
    byte[] datumTag = blake2b.Hash(new(outRefBytes));

    CborBoundedBytes boundedBytes = new(datumTag);
    Console.WriteLine(Convert.ToHexString(CborSerializer.Serialize(boundedBytes)));
}

async Task Cancel()
{
    TransactionInput lockedUtxoOutRef = new(
        Convert.FromHexString("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
        0
    );

    PlutusInt64 inputIndex = new(0);
    PlutusConstr outputIndexes = new([
        new PlutusInt64(0),
        new PlutusConstr([]) { ConstrIndex = 122 },
        new PlutusConstr([]) { ConstrIndex = 122 }
    ])
    {
        ConstrIndex = 121
    };
    PlutusConstr actionType = new([
        new PlutusConstr([]) { ConstrIndex = 121 }
    ])
    {
        ConstrIndex = 124
    };

    PlutusConstr action = new([
        inputIndex,
        outputIndexes,
        actionType
    ])
    {
        ConstrIndex = 121
    };

    PlutusList withdrawRedeemer = new([action]);

    RedeemerKey spendRedeemerKey = new(0, 0);
    RedeemerValue spendRedeemerValue = new(
        new PlutusConstr([]) { ConstrIndex = 121 },
        new ExUnits(1400000, 100000000)
    );

    RedeemerKey withdrawRedeemerKey = new(3, 0);
    RedeemerValue withdrawRedeemerValue = new(
        withdrawRedeemer,
        new ExUnits(1400000, 100000000)
    );

    var cancel = TransactionTemplateBuilder<CancelParameters>.Create(provider)
        .AddStaticParty("tan", tanAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddStaticParty("platform", platformAddress.ToBech32())
        .AddStaticParty("withdrawal", withdrawalAddress.ToBech32())
        .AddRequiredSigner("tan")
        .AddInput((options, cancelParams) =>
        {
            options.From = "validator";
            options.UtxoRef = cancelParams.LockedUtxoOutref;
            options.Redeemer = cancelParams.SpendRedeemer;
        })
        .AddInput((options, cancelParams) =>
        {
            options.From = "validator";
            options.UtxoRef = cancelParams.ScriptOutref;
            options.IsReference = true;
        })
        .AddInput((options, cancelParams) =>
        {
            options.From = "tan";
        })
        .AddOutput((options, cancelParams) =>
        {
            options.To = "platform";
            options.Amount = cancelParams.PlatformAmount;
        })
        .AddWithdrawal((options, cancelParams) =>
        {
            options.From = "withdrawal";
            options.Amount = 0;
            options.Redeemer = cancelParams.WithdrawRedeemer;
        })
        .Build();

    CancelParameters cancelParameters = new(
        LockedUtxoOutref: new(
            Convert.FromHexString("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString("97773a4f7940025dfffbe4e26d970cdc94205ed8aa241232afb43a2c04f7b126"),
            0
        ),
        SpendRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue> { { spendRedeemerKey, spendRedeemerValue } }
        ),
        WithdrawRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue> { { withdrawRedeemerKey, withdrawRedeemerValue } }
        ),  
        PlatformAmount: new Lovelace(2_000_000)
    );

    Transaction unsignedCancelTx = await cancel(cancelParameters);
    Transaction signedCancelTx = unsignedCancelTx.Sign(privateKey);
    string txCbor = Convert.ToHexString(CborSerializer.Serialize(signedCancelTx));
    Console.WriteLine(txCbor);

    await Task.CompletedTask;
}