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
string validatorAddress = "addr_test1xz7gq954ufeyjyauukacqnnz3cvatgq6ylevupj397pln4ausqtftcnjfyfmeedmsp8x9rse6ksp5fljecr9zturl8ts3j3ypk";
string withdrawalAddress = "stake_test17z7gq954ufeyjyauukacqnnz3cvatgq6ylevupj397pln4cutpxss";

Action<Dictionary<int, Dictionary<string, int>>, CancelParameter, Dictionary<RedeemerKey, RedeemerValue>> redeemerBuilder =
    (inputOutputAssosciations, parameters, redeemers) =>
    {
        List<PlutusData> actions = [];
        foreach (var assoc in inputOutputAssosciations)
        {
            List<PlutusData> outputIndicesData = [];
            foreach (var outputIndex in assoc.Value)
            {
                outputIndicesData.Add(new PlutusInt64(outputIndex.Value));
            }
            PlutusConstr outputIndicesPlutusData = new(outputIndicesData)
            {
                ConstrIndex = 121
            };
            PlutusConstr actionPlutusData = new([new PlutusInt64(assoc.Key), outputIndicesPlutusData])
            {
                ConstrIndex = 124
            };
            actions.Add(actionPlutusData);
        }
        PlutusList withdrawRedeemer = new(actions)
        {
            ConstrIndex = 121
        };
        redeemers.Add(new RedeemerKey(3, 0), new RedeemerValue(withdrawRedeemer, new ExUnits(1400000, 100000000)));
    };

var unlockTx = TransactionTemplateBuilder<CancelParameter>.Create(provider)
    .AddStaticParty("tan", ownerAddress, true)
    .AddStaticParty("validator", validatorAddress)
    .AddStaticParty("withdrawal", withdrawalAddress)
    .AddInput((options, unlockParams) =>
    {
        options.From = "validator";
        options.UtxoRef = unlockParams.ScriptRefUtxoOutref;
        options.IsReference = true;
    })
    .AddInput((options, unlockParams) =>
    {
        options.From = "validator";
        options.UtxoRef = unlockParams.LockedUtxoOutRef;
        options.Redeemer = unlockParams.Redeemer;
        options.Id = "cancel";
    })
    .AddOutput((options, unlockParams) =>
    {
        options.To = "tan";
        options.Amount = unlockParams.MainAmount;
        options.AssociatedInputId = "cancel";
        options.Id = "main";
    })
    .AddOutput((options, unlockParams) =>
    {
        options.To = "tan";
        options.Amount = unlockParams.FeeAmount;
        options.AssociatedInputId = "cancel";
        options.Id = "fee";
    })
    .AddOutput((options, unlockParams) =>
    {
        options.To = "tan";
        options.Amount = unlockParams.ChangeAmount;
        options.AssociatedInputId = "cancel";
        options.Id = "change";
    })
    .AddWithdrawal((options, unlockParams) =>
    {
        options.From = "withdrawal";
        options.Amount = unlockParams.WithdrawalAmount;
        options.RedeemerBuilder = redeemerBuilder;
    })
    .Build();

PlutusConstr plutusConstr = new([])
{
    ConstrIndex = 121
};

var spendRedeemerKey = new RedeemerKey(0, 1);
var spendRedeemerValue = new RedeemerValue(plutusConstr, new ExUnits(1400000, 100000000));

var withdrawRedeemerKey = new RedeemerKey(3, 0);
var withdrawRedeemerValue = new RedeemerValue(plutusConstr, new ExUnits(140000000, 10000000000));

string lockTxHash = "e6373cf224644c2bd3c043c933c9e8fe4f4c994db051e98acb03fe21d8ccb7a8";
string scriptRefTxHash = "8c712cd5242be0c4074cf2fc14b96c6d97c9c12e14f9114ad4eb8637a2849232";

CancelParameter unlockParams = new(
    new TransactionInput(Convert.FromHexString(lockTxHash), 0),
    new TransactionInput(Convert.FromHexString(scriptRefTxHash), 0),
    new RedeemerMap(new Dictionary<RedeemerKey, RedeemerValue> { { spendRedeemerKey, spendRedeemerValue } }),
    MainAmount: new Lovelace(5_375_000),
    FeeAmount: new Lovelace(3_000_000),
    ChangeAmount: new Lovelace(5_000_000),
    0,
   new RedeemerMap(new Dictionary<RedeemerKey, RedeemerValue> { { withdrawRedeemerKey, withdrawRedeemerValue } })
);

PostMaryTransaction unsignedCancelTx = await unlockTx(unlockParams);
PostMaryTransaction signedCancelTx = unsignedCancelTx.Sign(privateKey);
Console.WriteLine(Convert.ToHexString(CborSerializer.Serialize(signedCancelTx)));