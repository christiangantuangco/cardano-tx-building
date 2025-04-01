using CardanoTxBuilding;
using CardanoTxBuilding.Data.Extensions;
using Chrysalis.Cbor.Serialization;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Types.Cardano.Core.Protocol;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;
using Chrysalis.Tx.Builders;
using Chrysalis.Tx.Extensions;
using Chrysalis.Tx.Providers;
using Chrysalis.Wallet.Models.Enums;
using Chrysalis.Wallet.Models.Keys;
using Chrysalis.Wallet.Words;

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

string ownerAddress = "addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk";
string validatorAddress = "addr_test1wpxrfjfkvygq6jwut35n4tm58q75zjavm3fvrs0ql8l8cqg3le8tk";
string feeAddress = "addr_test1qpw35a2ms4tthpxdcdul0pyztjs8n4p9sfk97ugxmte9hnzarf64hp2khwzvmsme77zgyh9q082ztqnvtacsdkhjt0xq65cf42";
string withdrawalAddress = "stake_test17pxrfjfkvygq6jwut35n4tm58q75zjavm3fvrs0ql8l8cqg3h8luu";

string scriptRefTxHash = "91970ac10b0d6e28f399619bcfddca4c0dce76f893aeaa48777f3316ad859a18";
string lockTxHash = "ed7a6ab4d373f4950474e7242bc8e8d30fa6476cf372eee8e7be963d7b519e77";

string txCbor = string.Empty;
// txCbor = await SwapTransaction();
txCbor = await CancelTransaction();
Console.WriteLine(txCbor);

async Task<string> SwapTransaction()
{
    Action<Dictionary<int, Dictionary<string, int>>, SwapParameters, Dictionary<RedeemerKey, RedeemerValue>> swapRedeemerBuilder =
        (inputOutputAssosciations, parameters, redeemers) =>
        {
            List<PlutusData> operations = [];
            foreach (KeyValuePair<int, Dictionary<string, int>> assoc in inputOutputAssosciations)
            {
                try
                {
                    int[] indicesList = [.. assoc.Value.Values];

                    List<PlutusData> indicesData = [];
                    indicesData.Add(new PlutusInt64(indicesList[0]));
                    indicesData.Add(new PlutusConstr([new PlutusInt64(indicesList[1])])
                    {
                        ConstrIndex = 121
                    });
                    indicesData.Add(new PlutusInt64(indicesList[2]));

                    PlutusConstr indices = new(indicesData)
                    {
                        ConstrIndex = 121
                    };

                    PlutusList innerList = new([new PlutusConstr([]){ ConstrIndex = parameters.Action.GetActionType() }, indices]);
                    PlutusList outerList = new([innerList]);

                    operations.Add(outerList);
                } 
                catch {}
            }
            PlutusConstr withdrawRedeemer = new(operations)
            {
                ConstrIndex = 121
            };
            redeemers.Add(new RedeemerKey(3, 0), new RedeemerValue(withdrawRedeemer, new ExUnits(1400000, 100000000)));
        };

    Func<SwapParameters, Task<PostMaryTransaction>> swapTx = TransactionTemplateBuilder<SwapParameters>.Create(provider)
        .AddStaticParty("tan", ownerAddress, true)
        .AddStaticParty("validator", validatorAddress)
        .AddStaticParty("withdrawal", withdrawalAddress)
        .AddInput((options, swapParams) =>
        {
            options.From = "validator";
            options.UtxoRef = swapParams.LockedUtxoOutRef;
            options.Redeemer = swapParams.SpendRedeemer;
            options.Id = "swap";
        })
        .AddInput((options, swapParams) =>
        {
            options.From = "validator";
            options.UtxoRef = swapParams.ScriptRefUtxoOutref;
            options.IsReference = true;
        })
        .AddOutput((options, swapParams) =>
        {
            options.To = "tan";
            options.Amount = swapParams.MainAmount;
            options.AssociatedInputId = "swap";
            options.Id = "main";
        })
        .AddOutput((options, swapParams) =>
        {
            options.To = "tan";
            options.Amount = swapParams.FeeAmount;
            options.AssociatedInputId = "swap";
            options.Id = "fee";
        })
        .AddOutput((options, swapParams) =>
        {
            options.To = "tan";
            options.Amount = swapParams.ChangeAmount;
            options.AssociatedInputId = "swap";
            options.Id = "change";
        })
        .AddWithdrawal((options, swapParams) =>
        {
            options.From = "withdrawal";
            options.Amount = swapParams.WithdrawalAmount;
            options.RedeemerBuilder = swapRedeemerBuilder;
        })
        .Build();

    RedeemerKey spendRedeemerKey = new(0, 1);
    RedeemerValue spendRedeemerValue = new(
        new PlutusConstr([])
        {
            ConstrIndex = 121
        },
        new ExUnits(1400000, 100000000)
    );

    SwapParameters swapParams = new(
        LockedUtxoOutRef: new TransactionInput(Convert.FromHexString(lockTxHash), 0),
        ScriptRefUtxoOutref: new TransactionInput(Convert.FromHexString(scriptRefTxHash), 0),
        SpendRedeemer: new RedeemerMap(new Dictionary<RedeemerKey, RedeemerValue> { { spendRedeemerKey, spendRedeemerValue } }),
        MainAmount: new Lovelace(6_000_000),
        ChangeAmount: new Lovelace(5_000_000),
        FeeAmount: new Lovelace(1_000_000),
        0
    );

    PostMaryTransaction unsignedSwapTx = await swapTx(swapParams);
    PostMaryTransaction signedSwapTx = unsignedSwapTx.Sign(privateKey);
    return Convert.ToHexString(CborSerializer.Serialize(signedSwapTx));
}

async Task<string> CancelTransaction()
{
    string lockTxHash = "c4ba7d12b495ed7e35d3bf4b19ad0d6da5eccf2c905292bd5bfe08a82ceac8f6";

    Action<Dictionary<int, Dictionary<string, int>>, CancelParameters, Dictionary<RedeemerKey, RedeemerValue>> cancelRedeemerBuilder =
        (inputOutputAssosciations, parameters, redeemers) =>
        {
            List<PlutusData> operations = [];
            foreach (KeyValuePair<int, Dictionary<string, int>> assoc in inputOutputAssosciations)
            {
                try
                {
                    int[] indicesList = [.. assoc.Value.Values];

                    List<PlutusData> indicesData = [];
                    indicesData.Add(new PlutusInt64(indicesList[0]));
                    indicesData.Add(new PlutusConstr([]));
                    indicesData.Add(new PlutusInt64(indicesList[1]));

                    PlutusConstr indices = new(indicesData)
                    {
                        ConstrIndex = 121
                    };

                    PlutusList innerList = new([new PlutusConstr([]){ ConstrIndex = parameters.Action.GetActionType() }, indices]);
                    PlutusList outerList = new([innerList]);

                    operations.Add(outerList);
                }
                catch {}
            }
            PlutusConstr withdrawRedeemer = new(operations)
            {
                ConstrIndex = 121
            };
            redeemers.Add(new RedeemerKey(3, 0), new RedeemerValue(withdrawRedeemer, new ExUnits(1400000, 100000000)));
        };

    PlutusConstr action = new([])
    {
        ConstrIndex = 122
    };

    PlutusList indecesData = new([
        new PlutusInt64(0),
        new PlutusConstr([])
        {
            ConstrIndex = 122
        },
        new PlutusInt64(1)
    ]);
    PlutusConstr indexes = new([indecesData])
    {
        ConstrIndex = 121
    };

    PlutusList innerList = new([action, indexes]);
    PlutusList outerList = new([innerList]);
    
    PlutusConstr withdrawRedeemer = new([outerList])
    {
        ConstrIndex = 121
    };

    RedeemerKey withdrawRedeemerKey = new(3, 0);
    RedeemerValue withdrawRedeemerValue = new(
        withdrawRedeemer,
        new ExUnits(1400000, 100000000)
    );

    Func<CancelParameters, Task<PostMaryTransaction>> cancelTx = TransactionTemplateBuilder<CancelParameters>.Create(provider)
        .AddStaticParty("tan", ownerAddress, true)
        .AddStaticParty("fee", feeAddress)
        .AddStaticParty("validator", validatorAddress)
        .AddStaticParty("withdrawal", withdrawalAddress)
        .AddInput((options, cancelParams) =>
        {
            options.From = "validator";
            options.UtxoRef = cancelParams.LockedUtxoOutRef;
            options.Redeemer = cancelParams.SpendRedeemer;
        })
        .AddInput((options, cancelParams) =>
        {
            options.From = "validator";
            options.UtxoRef = cancelParams.ScriptRefUtxoOutref;
            options.IsReference = true;
        })
        .AddOutput((options, cancelParams) =>
        {
            options.To = "tan";
            options.Amount = cancelParams.MainAmount;
        })
        .AddOutput((options, cancelParams) =>
        {
            options.To = "fee";
            options.Amount = cancelParams.FeeAmount;
        })
        .AddWithdrawal((options, cancelParams) =>
        {
            options.From = "withdrawal";
            options.Amount = cancelParams.WithdrawalAmount;
            options.Redeemers = cancelParams.WithdrawRedeemer;
        })
        .Build();

    RedeemerKey spendRedeemerKey = new(0, 0);
    RedeemerValue spendRedeemerValue = new(
        new PlutusConstr([])
        {
            ConstrIndex = 121
        },
        new ExUnits(1400000, 100000000)
    );

    CancelParameters cancelParams = new(
        LockedUtxoOutRef: new TransactionInput(Convert.FromHexString(lockTxHash), 0),
        ScriptRefUtxoOutref: new TransactionInput(Convert.FromHexString(scriptRefTxHash), 0),
        SpendRedeemer: new RedeemerMap(
            new Dictionary<RedeemerKey, RedeemerValue> { { spendRedeemerKey, spendRedeemerValue } }
        ),
        MainAmount: new Lovelace(4_000_000),
        FeeAmount: new Lovelace(2_000_000),
        0,
        WithdrawRedeemer: new RedeemerMap(
            new Dictionary<RedeemerKey, RedeemerValue> { { withdrawRedeemerKey, withdrawRedeemerValue } }
        )
    );

    PostMaryTransaction unsignedCancelTx = await cancelTx(cancelParams);
    PostMaryTransaction signedCancelTx = unsignedCancelTx.Sign(privateKey);
    return Convert.ToHexString(CborSerializer.Serialize(signedCancelTx));
}