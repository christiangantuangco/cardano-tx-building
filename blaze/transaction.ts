import {
    Address,
    addressFromValidator,
    Bip32PrivateKey,
    CredentialType,
    Ed25519KeyHashHex,
    Hash28ByteBase16,
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

const LendDatumSchema = Data.Object({
    adaOwner: DatumAddress,
    collateralDetails: CollateralDetails,
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanDuration: Data.Integer(),
});
type LendDatum = Static<typeof LendDatumSchema>;
const LendDatum = LendDatumSchema as unknown as LendDatum;

const OutputReferenceSchema = Data.Object({
    transactionId: Data.Bytes(),
    outputIndex: Data.Integer(),
});
type OutputReference = Static<typeof OutputReferenceSchema>;
const OutputReference = OutputReferenceSchema as unknown as OutputReference;

const BorrowDatumSchema = Data.Object({
    adaOwner: Data.Bytes(),
    assetOwner: Data.Bytes(),
    collateralDetails: CollateralDetails,
    loanAmount: Data.Integer(),
    interestAmount: Data.Integer(),
    loanEndTime: Data.Integer(),
    outputReference: OutputReference,
});
type BorrowDatum = Static<typeof BorrowDatumSchema>;
const BorrowDatum = BorrowDatumSchema as unknown as BorrowDatum;

const FeeOutputDatumSchema = Data.Object({
    outputReference: OutputReference
});
type FeeOutput = Static<typeof FeeOutputDatumSchema>;
const FeeOutput = FeeOutputDatumSchema as unknown as FeeOutput;

const OutputIndexesSchema = Data.Object({
    outputIndex: Data.Integer(),
    feeOutputIndex: Data.Nullable(Data.Integer()),
    scriptChangeIndex: Data.Nullable(Data.Integer()),
});
type OutputIndexes = Static<typeof OutputIndexesSchema>;
const OutputIndexes = OutputIndexesSchema as unknown as OutputIndexes;

const LevvyTypeSchema = Data.Enum([
    Data.Object({ Tokens: Data.Object([]) }),
    Data.Object({ Nfts: Data.Object([]) })
])
type LevvyType = Static<typeof LevvyTypeSchema>;
const LevvyType = LevvyTypeSchema as unknown as LevvyType;

const LevvyTokenSchema = Data.Object(Data.void())
type LevvyToken = Static<typeof LevvyTokenSchema>;
const LevvyToken = LevvyTokenSchema as unknown as LevvyToken;

const ActionSchema = Data.Enum([
    Data.Object({ BorrowAction: LevvyType }),
    Data.Object({ RepayAction: LevvyType }),
    Data.Object({ ForecloseAction: LevvyType }),
    Data.Object({ CancelAction: LevvyType }),
]);
type Action = Static<typeof ActionSchema>;
const Action = ActionSchema as unknown as Action;

const WithdrawRedeemerSchema = Data.Object({
    arrangement: Data.Array(
        Data.Tuple([
            Data.Integer(),
            OutputIndexes,
            Action
        ])
    )
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

    const validatorAddr = addressFromValidator(NetworkId.Testnet, script)
    const walletAddr = wallet.address;

    console.log(walletAddr.toBech32());
}

async function lockScriptRefToContract(blaze: Blaze<Blockfrost, HotWallet>, validatorAddr: Address, script: Script) {
    const scriptRefTx = await blaze
        .newTransaction()
        .deployScript(script, validatorAddr)
        .complete();

    const signedTx = await blaze.signTransaction(scriptRefTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function lockAssetsToContract(blaze: Blaze<Blockfrost, HotWallet>, validatorAddr: Address) {
    const lendCollateralDetails = Data.to({
        policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
        assetName: "434e4354",
        collateralAmount: 10_000n,
    }, CollateralDetails);

    const paymentCredential = Data.to({
        keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d"
    }, DatumCredential);
    
    const ownerAddress = Data.to({
        paymentCredential: paymentCredential,
        stakeCredential: null
    }, DatumAddress)

    const lendDatum = Data.to({
        adaOwner: ownerAddress,
        collateralDetails: lendCollateralDetails,
        loanAmount: 10_000_000n,
        interestAmount: 5_000_000n,
        loanDuration: 60n,
    }, LendDatum);

    const lendTx = await blaze
        .newTransaction()
        .lockLovelace(validatorAddr, 10_000_000n, lendDatum)
        .complete();

    const signedTx = await blaze.signTransaction(lendTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function cancelLockAssetsFromContract(blaze: Blaze<Blockfrost, HotWallet>, wallet: HotWallet, script: Script) {
    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet)

    const lockedUtxos = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("88c29800a9365287905816ad0c8fc9c4bd2d1397f6694ca82fe5106682513baa"),
            0n
        )
    ]);

    console.log(rewardAccount);
    console.log(lockedUtxos[0].toCbor());

    const withdrawRedeemer = Data.to({   
        arrangement: [
            [
                0n,
                Data.to({
                    outputIndex: 0n,
                    feeOutputIndex: null,
                    scriptChangeIndex: null, 
                }, OutputIndexes),
                Data.to({
                    CancelAction: Data.to({ Tokens: Data.Object([]) }, LevvyType)
                }, Action)
            ]
        ]
        
    }, WithdrawRedeemer)
    console.log(withdrawRedeemer.toCbor());

    const cancelTx = await blaze
        .newTransaction()
        .addInput(lockedUtxos[0], Data.void())
        .provideScript(script)
        .addRequiredSigner(Ed25519KeyHashHex(wallet.address.asBase()?.getPaymentCredential().hash!))
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .complete();
    
    console.log(cancelTx.toCbor())

    const signedTx = await blaze.signTransaction(cancelTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

main();