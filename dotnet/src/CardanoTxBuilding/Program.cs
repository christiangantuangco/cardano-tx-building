using CardanoTxBuilding;
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

var provider = new Blockfrost("previewajMhMPYerz9Pd3GsqjayLwP5mgnNnZCC");

string ownerAddress = "addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk";
string validatorAddress = "addr_test1wpxrfjfkvygq6jwut35n4tm58q75zjavm3fvrs0ql8l8cqg3le8tk";
string withdrawalAddress = "stake_test17pxrfjfkvygq6jwut35n4tm58q75zjavm3fvrs0ql8l8cqg3h8luu";

Action<Dictionary<int, Dictionary<string, int>>, SwapParameters, Dictionary<RedeemerKey, RedeemerValue>> redeemerBuilder =
    (inputOutputAssosciations, parameters, redeemers) =>
    {
        List<PlutusData> operations = [];
        foreach (var assoc in inputOutputAssosciations)
        {
            try
            {
                var indicesList = assoc.Value.Values.ToArray();

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

                PlutusList innerList = new([new PlutusConstr([]){ ConstrIndex = 121 }, indices]);
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

var swapTx = TransactionTemplateBuilder<SwapParameters>.Create(provider)
    .AddStaticParty("tan", ownerAddress, true)
    .AddStaticParty("validator", validatorAddress)
    .AddStaticParty("withdrawal", withdrawalAddress)
    .AddInput((options, unlockParams) =>
    {
        options.From = "validator";
        options.UtxoRef = unlockParams.LockedUtxoOutRef;
        options.Redeemer = unlockParams.SpendRedeemer;
        options.Id = "swap";
    })
    .AddInput((options, unlockParams) =>
    {
        options.From = "validator";
        options.UtxoRef = unlockParams.ScriptRefUtxoOutref;
        options.IsReference = true;
    })
    .AddOutput((options, cancelParams) =>
    {
        options.To = "tan";
        options.Amount = cancelParams.MainAmount;
        options.AssociatedInputId = "swap";
        options.Id = "main";
    })
    .AddOutput((options, unlockParams) =>
    {
        options.To = "tan";
        options.Amount = unlockParams.FeeAmount;
        options.AssociatedInputId = "swap";
        options.Id = "fee";
    })
    .AddOutput((options, unlockParams) =>
    {
        options.To = "tan";
        options.Amount = unlockParams.ChangeAmount;
        options.AssociatedInputId = "swap";
        options.Id = "change";
    })
    .AddWithdrawal((options, unlockParams) =>
    {
        options.From = "withdrawal";
        options.Amount = unlockParams.WithdrawalAmount;
        options.RedeemerBuilder = redeemerBuilder;
    })
    .Build();

var spendRedeemerKey = new RedeemerKey(0, 1);
var spendRedeemerValue = new RedeemerValue(
    new PlutusConstr([])
    {
        ConstrIndex = 121
    },
    new ExUnits(1400000, 100000000)
);

string lockTxHash = "d8c659063d32ec684379c04b57128a9393fd6c40aed7d52764faa85d47d8304c";
string scriptRefTxHash = "91970ac10b0d6e28f399619bcfddca4c0dce76f893aeaa48777f3316ad859a18";

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
Console.WriteLine(Convert.ToHexString(CborSerializer.Serialize(signedSwapTx)));
