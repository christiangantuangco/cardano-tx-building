import {
    Address,
    addressFromValidator,
    Bip32PrivateKey,
    Credential,
    CredentialType,
    Ed25519KeyHashHex,
    HexBlob,
    mnemonicToEntropy,
    NetworkId,
    PlutusV3Script,
    RewardAccount,
    Script,
    TransactionId,
    TransactionInput,
    wordlist,
} from "@blaze-cardano/core";
import { HotWallet, Blaze, Data, Static, Blockfrost, Wallet } from "@blaze-cardano/sdk";
import dotenv from 'dotenv';

const CollateralDetailsSchema = Data.Object({
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
    collateralAmount: Data.Integer(),
});
type CollateralDetails = Static<typeof CollateralDetailsSchema>;
const CollateralDetails = CollateralDetailsSchema as unknown as CollateralDetails;

const DatumCredentialSchema = Data.Object({
    keyHash: Data.Bytes()
})
type DatumCredential = Static<typeof DatumCredentialSchema>;
const DatumCredential = DatumCredentialSchema as unknown as DatumCredential;

const DatumAddressSchema = Data.Object({
    paymentCredential: DatumCredential,
    stakeCredential: Data.Nullable(DatumCredential)
});
type DatumAddress = Static<typeof DatumAddressSchema>;
const DatumAddress = DatumAddressSchema as unknown as DatumAddress;

const TokenDetailsSchema = Data.Object({
    policy_id: Data.Bytes(),
    asset_name: Data.Bytes(),
    amount: Data.Integer(),
});
type TokenDetails = Static<typeof TokenDetailsSchema>;
const TokenDetails = TokenDetailsSchema as unknown as TokenDetails;

const DatumSchema = Data.Object({
    owner: DatumAddress,
    token: TokenDetails,
});
type Datum = Static<typeof DatumSchema>;
const Datum = DatumSchema as unknown as Datum;

const ActionSchema = Data.Enum([
    Data.Object({ Swap: Data.Object([]) }),
    Data.Object({ Cancel: Data.Object([]) }),
]);
type Action = Static<typeof ActionSchema>;
const Action = ActionSchema as unknown as Action;

const IndexesSchema = Data.Object({
    input_index: Data.Integer(),
    output_index: Data.Nullable(Data.Integer()),
    fee_index: Data.Integer(),
});
type Indexes = Static<typeof IndexesSchema>;
const Indexes = IndexesSchema as unknown as Indexes;

const WithdrawRedeemerSchema = Data.Object({
    operation: Data.Array(Data.Tuple([
        Data.Object({ action: Action }),
        Data.Object({ indexes: Indexes })
    ])),
});
type WithdrawRedeemer = Static<typeof WithdrawRedeemerSchema>;
const WithdrawRedeemer = WithdrawRedeemerSchema as unknown as WithdrawRedeemer;

async function main() {
    dotenv.config();

    const mnemonic = process.env["MNEMONIC"]!;
    const entropy = mnemonicToEntropy(mnemonic, wordlist);
    const masterkey = Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy), "");

    const provider = new Blockfrost({
        network: "cardano-preview",
        projectId: process.env["BLOCK_FROST_PROJECT_ID"]!,
    });

    const wallet = await HotWallet.fromMasterkey(masterkey.hex(), provider);

    const blaze = await Blaze.from(provider, wallet);

    const script = Script.newPlutusV3Script(PlutusV3Script.fromCbor(
        HexBlob(process.env["COMPILED_CODE"]!)
    ));

    const validatorAddr = addressFromValidator(NetworkId.Testnet, script);
    const feeAddr = Address.fromBech32(process.env["FEE_ADDRESS"]!);

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    lock(blaze, validatorAddr, wallet)
}

// Lock an asset to Smart Contract
async function lock(blaze: Blaze<Blockfrost, HotWallet>, validatorAddr: Address, ownerWallet: HotWallet) {
    const datum = Data.to({
        owner: Data.to({
            paymentCredential: Data.to({
                keyHash: ownerWallet.address.asBase()?.getPaymentCredential().hash!
            }, DatumCredential),
            stakeCredential: null
        }, DatumAddress),
        token: Data.to({
            policy_id: "0d85a956ba19b06f15d74d96c94146dc3f7ec95b64123e397b8f8fe5",
            asset_name: "54455354455253",
            amount: 1000n,
        }, TokenDetails),
    }, Datum)

    const lockTx = await blaze
        .newTransaction()
        .lockLovelace(validatorAddr, 10_000_000n, datum)
        .complete();

    const signedTx = await blaze.signTransaction(lockTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Cancel a locked utxo from Smart Contract
async function cancel(
    blaze: Blaze<Blockfrost, HotWallet>,
    script: Script,
    rewardAccount: RewardAccount,
    feeAddr: Address,
    ownerWallet: HotWallet
) {
    const lockedUtxos = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("a11d37b4116f95f454e44083980efa3f09ad909a4cd7f751253c2cf1cd505e92"),
            0n
        )
    ]);

    const cancelAction = Data.to({ Cancel: Data.Object([]) }, Action);

    const indexes = Data.to({
        input_index: 0n,
        output_index: null,
        fee_index: 0n,
    }, Indexes)

    const withdrawRedeemer = Data.to({
        operation: [[ cancelAction, indexes ]]
    }, WithdrawRedeemer)

    const cancelTx = await blaze
        .newTransaction()
        .addInput(lockedUtxos[0], Data.void())
        .addRequiredSigner(Ed25519KeyHashHex(ownerWallet.address.asBase()?.getPaymentCredential().hash!))
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .payLovelace(feeAddr, 2_000_000n)
        .provideScript(script)
        .complete();

    const signedTx = await blaze.signTransaction(cancelTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Register Stake Credential
async function registerCredential(blaze: Blaze<Blockfrost, HotWallet>, script: Script) {
    const registerTx = await blaze
        .newTransaction()
        .addRegisterStake(Credential.fromCore({
            type: CredentialType.ScriptHash,
            hash: script.hash()
        }))
        .complete();

    const signedTx = await blaze.signTransaction(registerTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

main();