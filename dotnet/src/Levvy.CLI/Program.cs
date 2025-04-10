using Chrysalis.Cbor.Types;
using Credential = Chrysalis.Cbor.Types.Plutus.Address.Credential;
using Chrysalis.Tx.Builders;
using Chrysalis.Tx.Providers;
using Address = Chrysalis.Wallet.Models.Addresses.Address;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Serialization;
using Levvy.CLI.Data.Utils;
using Chrysalis.Tx.Extensions;
using Chrysalis.Wallet.Models.Keys;
using Chrysalis.Wallet.Words;
using Chrysalis.Wallet.Models.Enums;
using Transaction = Chrysalis.Cbor.Types.Cardano.Core.Transaction.Transaction;
using Chrysalis.Cbor.Types.Plutus.Address;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;
using Chrysalis.Cbor.Types.Cardano.Core.Protocol;
using Levvy.CLI.Data.Types.Cbor;
using Microsoft.Extensions.Configuration;
using Levvy.CLI.Data.Types.Parameters;
using System.Net.NetworkInformation;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", false, true)
    .Build();

string words = configuration["MnemonicWords"]!;

Mnemonic mnemonic = Mnemonic.Restore(words, English.Words);
PrivateKey accountKey = mnemonic
            .GetRootKey()
            .Derive(PurposeType.Shelley, DerivationType.HARD)
            .Derive(CoinType.Ada, DerivationType.HARD)
            .Derive(0, DerivationType.HARD);
PrivateKey privateKey = accountKey
            .Derive(RoleType.ExternalChain)
            .Derive(0);

Blockfrost provider = new(configuration["BlockfrostProviderApiKey"]!);
Address ownerAddress = Address.FromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
Address borrowerAddress = Address.FromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
Address validatorAddress = Address.FromBech32("addr_test1wr76gm5plhfwfuwrtrf8uayyh8cgvzmrkr5wztn2khu8arq46jt5s");
Address mainAddress = Address.FromBech32("addr_test1vqt848n4vphu7ud4vg6nlzxklg3us6l2gqek5gk4jeqyd9gep0gpv");
Address authorizeAddress = Address.FromBech32("addr_test1vz6flzj8zvfxpwsuaavae54ej0dxrvjgsxxlfwerdmfy03cavfjln");
Address withdrawalAddress = Address.FromBech32("stake_test17qmglnv5j97jtl3ley6upj4g9q2cn5wc7ra9numaepa6taqcltu20");
string validatorScriptRefTxHash = configuration["LevvyTokenLendingValidatorScriptRefTxHash"]!;

TransactionInput collateralInput = new(
    TransactionId: Convert.FromHexString(configuration["CollateralOutrefTxHash"]!),
    0
);

// await Lend();
await Borrow();
// await Repay();
// await Claim();
// await Foreclose();
// await Cancel();

async Task Lend()
{
    LendTokenDetails lendTokenDetails = new(
        AdaOwner: new(
            PaymentCredential: new VerificationKey(ownerAddress.GetPaymentKeyHash() ?? []),
            StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(ownerAddress.GetStakeKeyHash() ?? [])))
        ),
        PolicyId: Convert.FromHexString("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
        AssetName: Convert.FromHexString("434e4354"),
        TokenAmount: 5000,
        LoanAmount: 5000000,
        InterestAmount: 3000000,
        LoanDuration: 4000,
        OutputReference: new(
            TransactionId: Convert.FromHexString("00"),
            OutputIndex: 0
        )
    );

    TokenDatum lendTokenDatum = new LendTokenDatum(lendTokenDetails);
    byte[] lendTokenDatumBytes = CborSerializer.Serialize(lendTokenDatum);

    LendParameters lendParams = new(
        Amount: new Lovelace(lendTokenDetails.LoanAmount),
        LendDatum: new InlineDatumOption(1, new(lendTokenDatumBytes))
    );

    Func<LendParameters, Task<Transaction>> lend = TransactionTemplateBuilder<LendParameters>.Create(provider)
    .AddStaticParty("lender", ownerAddress.ToBech32(), true)
    .AddStaticParty("validator", validatorAddress.ToBech32())
    .AddInput((options, lendParams) =>
    {
        options.From = "lender";
    })
    .AddOutput((options, lendParams) =>
    {
        options.To = "validator";
        options.Amount = lendParams.Amount;
        options.Datum = lendParams.LendDatum;
    })
    .Build();

    Transaction unsignedLendTx = await lend(lendParams);
    Transaction signedLendTx = unsignedLendTx.Sign(privateKey);
    string txId = await provider.SubmitTransactionAsync(signedLendTx);

    Console.Write("Transaction Id: ");
    Console.WriteLine(txId);
}

async Task Borrow()
{
    BorrowTokenDetails borrowTokenDetails = new(
        AdaOwner: new(
            PaymentCredential: new VerificationKey(ownerAddress.GetPaymentKeyHash() ?? []),
            StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(ownerAddress.GetStakeKeyHash() ?? [])))
        ),
        AssetOwner: new(
            PaymentCredential: new VerificationKey(borrowerAddress.GetPaymentKeyHash() ?? []),
            StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(borrowerAddress.GetStakeKeyHash() ?? [])))
        ),
        PolicyId: Convert.FromHexString("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
        AssetName: Convert.FromHexString("434e4354"),
        TokenAmount: 5000,
        LoanAmount: 5000000,
        InterestAmount: 3000000,
        LoanEndTime: 4000,
        OutputReference: new(
            Convert.FromHexString("ddc4136ee93399d80266ede7be9c0af14f2d06ae769cfee9a5276c906b2611a5"),
            0
        )
    );

    TokenDatum borrowTokenDatum = new BorrowTokenDatum(borrowTokenDetails);
    byte[] borrowTokenDatumBytes = CborSerializer.Serialize(borrowTokenDatum);

    PaymentDatum paymentDatum = new(borrowTokenDetails.OutputReference);
    byte[] paymentDatumBytes = CborSerializer.Serialize(paymentDatum);

    TransactionInput collateralInput = new(
        TransactionId: Convert.FromHexString(configuration["CollateralOutrefTxHash"]!),
        0
    );

    BorrowParameters borrowParams = new(
        LockedUtxoOutref: new(
            Convert.FromHexString("ddc4136ee93399d80266ede7be9c0af14f2d06ae769cfee9a5276c906b2611a5"),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString(validatorScriptRefTxHash),
            0
        ),
        CollateralOutref: collateralInput,
        SpendRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue>
            {
                {
                    new RedeemerKey(0, 1),
                    new RedeemerValue(
                        new PlutusConstr([]) { ConstrIndex = 121 },
                        new ExUnits(1400000, 100000000)
                    )
                }
            }
        ),
        TokenAmount: new LovelaceWithMultiAsset(
            new Lovelace(2_000_000),
            new MultiAssetOutput(
                new Dictionary<byte[], TokenBundleOutput>
                {
                    {
                       Convert.FromHexString("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
                        new TokenBundleOutput(
                            new Dictionary<byte[], ulong>
                            {
                                {
                                    Convert.FromHexString("434e4354"),
                                    5000
                                }
                            }
                        )
                    }
                }
            )
        ),
        FeeAmount: new Lovelace(LevvyUtils.CalculatePlatformFee(3000000, LevvyUtils.TOKEN_FEE_PERCENT)),
        Datum: new InlineDatumOption(1, new(borrowTokenDatumBytes)),
        PaymentDatum: new InlineDatumOption(1, new(paymentDatumBytes))
    );

    Func<BorrowParameters, Task<Transaction>> borrow = TransactionTemplateBuilder<BorrowParameters>.Create(provider)
        .AddStaticParty("borrower", borrowerAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddStaticParty("main", mainAddress.ToBech32())
        .AddInput((options, borrowParams) =>
        {
            options.From = "validator";
            options.UtxoRef = borrowParams.LockedUtxoOutref;
            options.Redeemer = borrowParams.SpendRedeemer;
        })
        .AddInput((options, borrowParams) =>
        {
            options.From = "validator";
            options.UtxoRef = borrowParams.ScriptOutref;
            options.IsReference = true;
        })
        .AddInput((options, borrowParams) =>
        {
            options.From = "borrower";
        })
        .AddOutput((options, borrowParams) =>
        {
            options.To = "validator";
            options.Amount = borrowParams.TokenAmount;
            options.Datum = borrowParams.Datum;
        })
        .AddOutput((options, borrowParams) =>
        {
            options.To = "main";
            options.Amount = new Lovelace(LevvyUtils.CalculatePlatformFee(borrowTokenDetails.InterestAmount, LevvyUtils.TOKEN_FEE_PERCENT));
            options.Datum = borrowParams.PaymentDatum;
        })
        .SetValidFrom(borrowTokenDetails.LoanEndTime)
        .Build();

    Transaction unsignedBorrowTx = await borrow(borrowParams);
    Console.WriteLine(Convert.ToHexString(CborSerializer.Serialize(unsignedBorrowTx)));
    Transaction signedBorrowTx = unsignedBorrowTx.Sign(privateKey);

    string txId = await provider.SubmitTransactionAsync(signedBorrowTx);

    Console.Write("Transaction Id: ");
    Console.WriteLine(txId);
}

async Task Repay()
{
    RepayTokenDetails repayTokenDetails = new(
        AdaOwner: new(
            PaymentCredential: new VerificationKey(ownerAddress.GetPaymentKeyHash() ?? []),
            StakeCredential: new Some<Inline<Credential>>(new(new VerificationKey(ownerAddress.GetStakeKeyHash() ?? [])))
        ),
        TokenAmount: 5000,
        LoanAmount: 5000000,
        InterestAmount: 3000000,
        OutputReference: new(
            Convert.FromHexString("a3ab9ffce7c6114b72de98a7bf0c97f98ca6baa5a612791e6a94a4c06809396f"),
            0
        )
    );
    RepayTokenDatum repayTokenDatum = new(repayTokenDetails);
    byte[] repayTokenDatumBytes = CborSerializer.Serialize(repayTokenDatum);

    RepayParameters repayParameters = new(
        LockedUtxoOutref: new(
            Convert.FromHexString("a3ab9ffce7c6114b72de98a7bf0c97f98ca6baa5a612791e6a94a4c06809396f"),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString(validatorScriptRefTxHash),
            0
        ),
        SpendRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue>
            {
                {
                    new RedeemerKey(0, 0),
                    new RedeemerValue(
                        new PlutusConstr([]) { ConstrIndex = 122 },
                        new ExUnits(1400000, 100000000)
                    )
                }
            }
        ),
        RepayAmount: new Lovelace(5000000 + 3000000),
        Datum: new InlineDatumOption(1, new(repayTokenDatumBytes))
    );

    Func<RepayParameters, Task<Transaction>> repay = TransactionTemplateBuilder<RepayParameters>.Create(provider)
        .AddStaticParty("borrower", borrowerAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddRequiredSigner("borrower")
        .AddInput((options, repayParams) =>
        {
            options.From = "validator";
            options.UtxoRef = repayParams.LockedUtxoOutref;
            options.Redeemer = repayParams.SpendRedeemer;
        })
        .AddInput((options, repayParams) =>
        {
            options.From = "validator";
            options.UtxoRef = repayParams.ScriptOutref;
            options.IsReference = true;
        })
        .AddOutput((options, repayParams) =>
        {
            options.To = "validator";
            options.Amount = repayParams.RepayAmount;
            options.Datum = repayParams.Datum;
        })
        .Build();

    Transaction unsignedRepayTx = await repay(repayParameters);
    Transaction signedRepayTx = unsignedRepayTx.Sign(privateKey);
    string txId = await provider.SubmitTransactionAsync(signedRepayTx);

    Console.Write("Transaction Id: ");
    Console.WriteLine(txId);
}

async Task Claim()
{
    PaymentDatum paymentDatum = new(
        new OutputReference(
            Convert.FromHexString("56b77d9857858b457b0fecf2d6f4fcfe6c5c59ea495e815e31ae4bf74fd60719"),
            0
        )
    );
    byte[] paymentDatumBytes = CborSerializer.Serialize(paymentDatum);

    ClaimParameters claimParameters = new(
        LockedUtxoOutref: new(
            Convert.FromHexString("56b77d9857858b457b0fecf2d6f4fcfe6c5c59ea495e815e31ae4bf74fd60719"),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString(validatorScriptRefTxHash),
            0
        ),
        CollateralOutref: new(
            Convert.FromHexString("7402f7e0387331987ff6b4e4d5a636d1dc132aebd5a700db880245f7643cfb2b"),
            0
        ),
        SpendRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue>
            {
                {
                    new RedeemerKey(0, 0),
                    new RedeemerValue(
                        new PlutusConstr([]) { ConstrIndex = 123 },
                        new ExUnits(1400000, 100000000)
                    )
                }
            }
        ),
        FeeAmount: new Lovelace(LevvyUtils.CalculatePlatformFee(3000000, LevvyUtils.TOKEN_FEE_PERCENT)),
        PaymentDatum: new InlineDatumOption(1, new(paymentDatumBytes))
    );

    Func<ClaimParameters, Task<Transaction>> claim = TransactionTemplateBuilder<ClaimParameters>.Create(provider)
        .AddStaticParty("lender", ownerAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddStaticParty("main", mainAddress.ToBech32())
        .AddRequiredSigner("lender")
        .AddInput((options, claimParams) =>
        {
            options.From = "validator";
            options.UtxoRef = claimParams.LockedUtxoOutref;
            options.Redeemer = claimParams.SpendRedeemer;
        })
        .AddInput((options, claimParams) =>
        {
            options.From = "validator";
            options.UtxoRef = claimParams.ScriptOutref;
            options.IsReference = true;
        })
        .AddInput((options, claimParams) =>
        {
            options.From = "lender";
            options.UtxoRef = claimParams.CollateralOutref;
        })
        .AddOutput((options, claimParams) =>
        {
            options.To = "main";
            options.Amount = claimParams.FeeAmount;
            options.Datum = claimParams.PaymentDatum;
        })
        .Build();

    Transaction unsignedClaimTx = await claim(claimParameters);
    Transaction signedClaimTx = unsignedClaimTx.Sign(privateKey);

    string txId = await provider.SubmitTransactionAsync(signedClaimTx);

    Console.Write("Transaction Id: ");
    Console.WriteLine(txId);
}

async Task Foreclose()
{
    PaymentDatum paymentDatum = new(
        new OutputReference(
            Convert.FromHexString("c9147bbdc103ac779cd59a92bdcf6c603b541e633267c27631c0ea61e3a803a9"),
            0
        )
    );
    byte[] paymentDatumBytes = CborSerializer.Serialize(paymentDatum);

    ForecloseParameters forecloseParameters = new(
        LockedUtxoOutref: new(
            Convert.FromHexString("c9147bbdc103ac779cd59a92bdcf6c603b541e633267c27631c0ea61e3a803a9"),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString(validatorScriptRefTxHash),
            0
        ),
        SpendRedeemer: new(
            new Dictionary<RedeemerKey, RedeemerValue>
            {
                {
                    new RedeemerKey(0, 1),
                    new RedeemerValue(
                        new PlutusConstr([]) { ConstrIndex = 124 },
                        new ExUnits(1400000, 100000000)
                    )
                }
            }
        ),
        FeeAmount: new Lovelace(LevvyUtils.CalculatePlatformFee(3000000, LevvyUtils.TOKEN_FEE_PERCENT)),
        PaymentDatum: new InlineDatumOption(1, new(paymentDatumBytes))
    );

    Func<ForecloseParameters, Task<Transaction>> foreclose = TransactionTemplateBuilder<ForecloseParameters>.Create(provider)
        .AddStaticParty("lender", ownerAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddStaticParty("main", mainAddress.ToBech32())
        .AddRequiredSigner("lender")
        .AddInput((options, forecloseParams) =>
        {
            options.From = "validator";
            options.UtxoRef = forecloseParams.LockedUtxoOutref;
            options.Redeemer = forecloseParams.SpendRedeemer;
        })
        .AddInput((options, forecloseParams) =>
        {
            options.From = "validator";
            options.UtxoRef = forecloseParams.ScriptOutref;
            options.IsReference = true;
        })
        .AddInput((options, forecloseParams) =>
        {
            options.From = "lender";
        })
        .AddOutput((options, forecloseParams) =>
        {
            options.To = "main";
            options.Amount = forecloseParams.FeeAmount;
            options.Datum = forecloseParams.PaymentDatum;
        })
        .SetValidFrom(4000 + 1) // @TODO: change the slot to current time
        .Build();

    Transaction unsignedClaimTx = await foreclose(forecloseParameters);
    Transaction signedClaimTx = unsignedClaimTx.Sign(privateKey);
    string txId = await provider.SubmitTransactionAsync(signedClaimTx);

    Console.Write("Transaction Id: ");
    Console.WriteLine(txId);
}

async Task Cancel()
{
    Func<CancelParameters, Task<Transaction>> cancel = TransactionTemplateBuilder<CancelParameters>.Create(provider)
        .AddStaticParty("ownerAddress", ownerAddress.ToBech32(), true)
        .AddStaticParty("validator", validatorAddress.ToBech32())
        .AddRequiredSigner("ownerAddress")
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
        .Build();

    CancelParameters cancelParameters = new(
        LockedUtxoOutref: new(
            Convert.FromHexString(""),
            0
        ),
        ScriptOutref: new(
            Convert.FromHexString(validatorScriptRefTxHash),
            0
        ),
        SpendRedeemer: new RedeemerMap(
            new Dictionary<RedeemerKey, RedeemerValue> { 
                { 
                    new RedeemerKey(0, 0),
                    new RedeemerValue(
                        new PlutusConstr([]) { ConstrIndex = 125 },
                        new ExUnits(1400000, 100000000)
                    )
                }
            }
        )
    );

    Transaction unsignedCancelTx = await cancel(cancelParameters);
    Transaction signedCancelTx = unsignedCancelTx.Sign(privateKey);
    string signedCancelTxCbor = await provider.SubmitTransactionAsync(signedCancelTx);
}