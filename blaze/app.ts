import {
    Address,
    addressFromValidator,
    AssetId,
    AssetName,
    Bip32PrivateKey,
    blake2b_256,
    Credential,
    CredentialType,
    Ed25519KeyHashHex,
    HexBlob,
    mnemonicToEntropy,
    NetworkId,
    PlutusV3Script,
    PolicyId,
    RewardAccount,
    Script,
    Slot,
    TokenMap,
    Transaction,
    TransactionId,
    TransactionInput,
    TransactionOutput,
    TxCBOR,
    Value,
    wordlist,
} from "@blaze-cardano/core";
import { Unwrapped } from "@blaze-cardano/ogmios";
import { HotWallet, Blaze, Data, Blockfrost, Kupmios, Core } from "@blaze-cardano/sdk";
import dotenv from 'dotenv';
import { calculatePlatformFee, createValue, tokenFeePercent } from "./lib/utils"
import {
    DatumAddress,
    CollateralDetails,
    Tokens,
    LendDetails,
    LevvyDatum,
    DatumCredential,
    OutputReference,
    LevvyType,
    BorrowDetails,
    OutputIndexes,
    ActionType,
    Action,
    WithdrawRedeemer,
    LoanInput,
} from "./lib/types";
import { AlwaysTrueAction, AlwaysTrueIndexes, AlwaysTrueTuple, AlwaysTrueWithdrawRedeemer, LevvyV2BorrowDetails, LevvyV2LendDetails, LevvyV2PaymentDatum, LevvyV2RepayDetails, LevvyV2TokenAction, LevvyV2TokenDatum, TokenDetails, TokenSwapDatum } from "./lib/schema";

async function main() {
    dotenv.config();

    const mnemonic = process.env["MNEMONIC"]!;
    const entropy = mnemonicToEntropy(mnemonic, wordlist);
    const masterkey = Bip32PrivateKey.fromBip39Entropy(Buffer.from(entropy), "");

    const blockfrostProvider = new Blockfrost({
        network: "cardano-preview",
        projectId: process.env["BLOCK_FROST_PROJECT_ID"]!,
    });

    const kupmiosProvider = new Kupmios(
        "https://kupo1970ya4w3dx5ak9adwxr.preview-v2.kupo-m1.demeter.run",
        await Unwrapped.Ogmios.new("https://ogmios1muwanva0ld5rqq8y6nc.preview-v6.ogmios-m1.demeter.run"),
    );

    const kupmiosWallet = await HotWallet.fromMasterkey(masterkey.hex(), kupmiosProvider);
    const blockfrostWallet = await HotWallet.fromMasterkey(masterkey.hex(), blockfrostProvider);

    const kupmiosBlaze = await Blaze.from(kupmiosProvider, kupmiosWallet);
    const blockfrostBlaze = await Blaze.from(blockfrostProvider, blockfrostWallet);

    const script = Script.newPlutusV3Script(PlutusV3Script.fromCbor(
        HexBlob(process.env["COMPILED_CODE"]!)
    ));

    const levvyScript = Script.newPlutusV3Script(PlutusV3Script.fromCbor(
        HexBlob(process.env["LEVVY_COMPILED_CODE"]!)
    ));

    const levvyV2Script = Script.newPlutusV3Script(PlutusV3Script.fromCbor(
        HexBlob(process.env["LEVVY_V2_COMPILED_CODE"]!)
    ));
    console.log(levvyV2Script.hash());

    const validatorAddress = addressFromValidator(NetworkId.Testnet, script);
    const platformAddress = Address.fromBech32(process.env["PLATFORM_ADDRESS"]!);
    const borrowerAddress = Address.fromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
    const receiverAddress = Address.fromBech32("addr_test1qqd86cnx53kdhyhwyu9czgmhkuucyevhp2ez7vxu3zkfa5vudpnr948a9kje6sqqqe5ear3wq260zns6q9ketpfl3jwq4vhh0k");
    const feeAddress = Address.fromBech32(process.env["FEE_ADDRESS"]!);

    const levvyValidatorAddress = addressFromValidator(NetworkId.Testnet, levvyScript);
    const levvyPlatformAddress = Address.fromBech32(process.env["LEVVY_PLATFORM_ADDRESS"]!);

    const levvyV2ValidatorAddress = addressFromValidator(NetworkId.Testnet, levvyV2Script);
    const levvyV2MainAddress = Address.fromBech32(process.env["LEVVY_V2_MAIN_ADDRESS"]!);

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    // await deployScriptToContract(kupmiosBlaze, levvyV2Script, levvyV2ValidatorAddress);
    // await registerCredential(kupmiosBlaze, levvyScript);

    // await sendLovelace(blockfrostBlaze, receiverAddress);

    // // LEVVY TRANSACTIONS
    // await lend(loan, kupmiosBlaze, levvyValidatorAddress);
    // await cancel(kupmiosBlaze, levvyScript, levvyPlatformAddress, kupmiosWallet);
    // await borrow(loan, kupmiosBlaze, borrowerAddress, levvyValidatorAddress, levvyPlatformAddress, levvyScript);
    // await repay(loan, blockfrostBlaze, script);
    // await foreclose(loan, blockfrostBlaze, script);

    // // LEVVY V2 TRANSACTIONS
    // await levvyV2Lend(kupmiosBlaze, levvyV2ValidatorAddress);
    // await levvyV2Borrow(kupmiosBlaze, kupmiosWallet.address, levvyV2ValidatorAddress, levvyV2MainAddress);
    // await levvyV2Repay(kupmiosBlaze, kupmiosWallet.address, levvyV2ValidatorAddress);
    // await levvyV2Cancel(kupmiosBlaze, kupmiosWallet.address);

    // await lockTx(kupmiosBlaze, validatorAddress);
    // await swapTx(kupmiosBlaze, rewardAccount);
    // await cancelTx(kupmiosBlaze, rewardAccount, kupmiosWallet.address, feeAddress);

    await evalTx(kupmiosProvider, kupmiosWallet);
}

async function lockTx(blaze: Blaze<Blockfrost | Kupmios, HotWallet>, validatorAddress: Address) {
    const datum = Data.to({
        owner: Data.to({
            paymentCredential: { keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d" },
            stakeCredential: {
                Inline: { credential: Data.to({ keyHash: "f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c" }, DatumCredential) }
            }
        }, DatumAddress),
        token: Data.to({
            policy_id: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
            asset_name: "434e4354",
            amount: 6_000_000n,
        }, TokenDetails)
    }, TokenSwapDatum)

    const lockTx = await blaze
        .newTransaction()
        .lockLovelace(validatorAddress, 5_000_000n, datum)
        .complete();

    const signedTx = await blaze.signTransaction(lockTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function swapTx(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    rewardAccount: RewardAccount
) {
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("ed7a6ab4d373f4950474e7242bc8e8d30fa6476cf372eee8e7be963d7b519e77"),
            0n
        )
    ]);

    const scriptRef = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("91970ac10b0d6e28f399619bcfddca4c0dce76f893aeaa48777f3316ad859a18"),
            0n
        )
    ]);

    const action = Data.to({
        Swap: Data.Object([])
    }, AlwaysTrueAction);

    const indexes = Data.to({
        inputIndex: 0n,
        outputIndex: 0n,
        feeIndex: 0n
    }, AlwaysTrueIndexes);

    const tuple = Data.to([action, indexes], AlwaysTrueTuple);

    const withdrawRedeemer = Data.to({
        operation: [tuple]
    }, AlwaysTrueWithdrawRedeemer)

    const swapTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addReferenceInput(scriptRef[0])
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .complete();

    console.log(swapTx.toCbor());
}

async function cancelTx(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    rewardAccount: RewardAccount,
    ownerAddress: Address,
    feeAddress: Address
) {
    const lockedCancelTx = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("c4ba7d12b495ed7e35d3bf4b19ad0d6da5eccf2c905292bd5bfe08a82ceac8f6"),
            0n
        )
    ]);

    const scriptRef = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("91970ac10b0d6e28f399619bcfddca4c0dce76f893aeaa48777f3316ad859a18"),
            0n
        )
    ]);

    const action = Data.to({
        Cancel: Data.Object([])
    }, AlwaysTrueAction);

    const indexes = Data.to({
        inputIndex: 0n,
        outputIndex: null,
        feeIndex: 0n
    }, AlwaysTrueIndexes);

    const tuple = Data.to([action, indexes], AlwaysTrueTuple);

    const withdrawRedeemer = Data.to({
        operation: [tuple]
    }, AlwaysTrueWithdrawRedeemer)

    const cancelTx = await blaze
        .newTransaction()
        .addInput(lockedCancelTx[0], Data.void())
        .addReferenceInput(scriptRef[0])
        .payLovelace(feeAddress, 2_000_000n)
        .addRequiredSigner(Ed25519KeyHashHex(ownerAddress.asBase()?.getPaymentCredential().hash!))
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .complete();
}

async function sendLovelace(blaze: Blaze<Blockfrost | Kupmios, HotWallet>, receiverAddress: Address) {
    const sendLovelaceTx = await blaze
        .newTransaction()
        .payLovelace(receiverAddress, 5_000_000n)
        .complete();

    const signedTx = await blaze.signTransaction(sendLovelaceTx);
    // console.log(signedTx.toCbor());
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Lock a lend position to smart contract
async function lend(
    loan: LoanInput,
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    validatorAddr: Address
) {
    const lendDetails = Data.to({
        lender: Data.to({
            paymentCredential: Data.to({ keyHash: loan.lender.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: loan.lender.asBase()?.getStakeCredential().hash! }, DatumCredential) } }
        }, DatumAddress),
        collateralDetails: Data.to({
            policyId: loan.collateral.policyId,
            assetName: loan.collateral.assetName,
            collateralAmount: loan.collateral.amount,
        }, CollateralDetails),
        loanAmount: loan.amount,
        interestAmount: loan.interestAmount,
        loanDuration: loan.duration,
        levvyType: Tokens,
    }, LendDetails);

    const platformFee = calculatePlatformFee(loan.interestAmount, tokenFeePercent);
    console.log(platformFee);
    const lendDatum = Data.to({
        LendDatum: { lendDetails }
    }, LevvyDatum);

    const lockTx = await blaze
        .newTransaction()
        .lockLovelace(
            validatorAddr, 
            loan.amount + platformFee,
            lendDatum
        )
        .complete();

    const signedTx = await blaze.signTransaction(lockTx);
    console.log(signedTx.toCbor());
    // const txId = await blaze.provider.postTransactionToChain(signedTx);
    // console.log("Transaction Id", txId);
}

async function levvyV2Lend(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    validatorAddress: Address
) {
    const lendTokenDetails = Data.to({
        adaOwner: Data.to({
            paymentCredential: Data.to({
                keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d"
            }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({
                keyHash: "f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c"
            }, DatumCredential) }}
        }, DatumAddress),
        policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
        assetName: "434e4354",
        tokenAmount: 6_000n,
        loanAmount: 5_000_000n,
        interestAmount: 3_000_000n,
        loanDuration: 3_600n,
        outputReference: Data.to({
            transaction_id: "00",
            output_index: 0n,
        }, OutputReference),
    }, LevvyV2LendDetails);

    const lendTokenDatum = Data.to({
        LendTokenDatum: { lendTokenDetails }
    }, LevvyV2TokenDatum);

    const lendTx = await blaze
        .newTransaction()
        .lockLovelace(validatorAddress, 5_000_000n, lendTokenDatum)
        .complete();

    const signedTx = await blaze.signTransaction(lendTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function levvyV2Borrow(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    ownerWallet: Address,
    validatorAddress: Address,
    mainAddress: Address
) {
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("34b21e2d38356bdd1c01c3e2d6807d183914f2b3f20390e3027e05a333ec347c"),
            0n
        )
    ]);

    const scriptRef = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId(process.env["LEVVY_V2_SCRIPT_REF_TX_HASH"]!),
            0n
        )
    ]);

    const borrowTokenDetails = Data.to({
        adaOwner: Data.to({
            paymentCredential: Data.to({ keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d" }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: "f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c" }, DatumCredential) } },
        }, DatumAddress),
        assetOwner: Data.to({
            paymentCredential: Data.to({ keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d" }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: "f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c" }, DatumCredential) } },
        }, DatumAddress),
        policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
        assetName: "434e4354",
        tokenAmount: 3500n,
        loanAmount: 5000000n,
        interestAmount: 3000000n,
        loanEndTime: 4000n,
        outputReference: Data.to({
            transaction_id: "34b21e2d38356bdd1c01c3e2d6807d183914f2b3f20390e3027e05a333ec347c",
            output_index: 0n,
        }, OutputReference),
    }, LevvyV2BorrowDetails);

    const borrowTokenDatum = Data.to({
        BorrowTokenDatum: { borrowTokenDetails }
    }, LevvyV2TokenDatum);

    const paymentDatum = Data.to({
        outputReference: Data.to({
            transaction_id: "34b21e2d38356bdd1c01c3e2d6807d183914f2b3f20390e3027e05a333ec347c",
            output_index: 0n,
        }, OutputReference)
    }, LevvyV2PaymentDatum);

    const assetId = AssetId.fromParts(
        PolicyId("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
        AssetName("434e4354")
    );
    const tokenMapper = new Map<AssetId, bigint>();

    const borrowTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.to({ BorrowTokenAction: Data.Object([]) }, LevvyV2TokenAction))
        .addReferenceInput(scriptRef[0])
        .setValidFrom(Slot(4000))
        .lockAssets(validatorAddress, new Value(5000000n, tokenMapper.set(assetId, 3500n)), borrowTokenDatum)
        .payLovelace(mainAddress, 2_000_000n, paymentDatum)
        .complete();

    const signedTx = await blaze.signTransaction(borrowTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function levvyV2Repay(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    payerAddress: Address,
    validatorAddress: Address
) {
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("2a969124d92942e786210fedf49fdb1c1fe527640e70fae3a865564654e54a5c"),
            0n
        )
    ]);

    const scriptRef = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId(process.env["LEVVY_V2_SCRIPT_REF_TX_HASH"]!),
            0n
        )
    ]);

    const repayTokenDetails = Data.to({
        adaOwner: Data.to({
            paymentCredential: Data.to({ keyHash: "8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d" }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: "f38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c" }, DatumCredential) } },
        }, DatumAddress),
        tokenAmount: 3500n,
        loanAmount: 5000000n,
        interestAmount: 3000000n,
        outputReference: Data.to({
            transaction_id: "2a969124d92942e786210fedf49fdb1c1fe527640e70fae3a865564654e54a5c",
            output_index: 0n,
        }, OutputReference),
    }, LevvyV2RepayDetails)

    const repayTokenDatum = Data.to({
        RepayTokenDatum: { repayTokenDetails }
    }, LevvyV2TokenDatum);

    const repayTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.to({ RepayTokenAction: Data.Object([]) }, LevvyV2TokenAction))
        .addReferenceInput(scriptRef[0])
        .addRequiredSigner(Ed25519KeyHashHex(payerAddress.asBase()?.getPaymentCredential().hash!))
        .lockAssets(validatorAddress, new Value(8000000n), repayTokenDatum)
        .complete();

    const signedTx = await blaze.signTransaction(repayTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function levvyV2Cancel(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    ownerAddress: Address
){
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("b9ee6ae8426d850999033ea14276f89cac619c7dbaabc3dda4d5237722e297bb"),
            0n
        )
    ]);

    const scriptRef = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId(process.env["LEVVY_V2_SCRIPT_REF_TX_HASH"]!),
            0n
        )
    ]);

    const cancelTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.to({ CancelTokenAction: Data.Object([]) }, LevvyV2TokenAction))
        .addReferenceInput(scriptRef[0])
        .addRequiredSigner(Ed25519KeyHashHex(ownerAddress.asBase()?.getPaymentCredential().hash!))
        .complete();

    const signedTx = await blaze.signTransaction(cancelTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}


// Borrow a lend position from Smart Contract
async function borrow(
    loan: LoanInput,
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    borrowerAddr: Address,
    validatorAddr: Address,
    platformAddr: Address,
    script: Script
) {
    // Locked Output Reference
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
            0n
        )
    ]);

    const platformFee = calculatePlatformFee(loan.interestAmount, tokenFeePercent);

    const outputRef = Data.to({
        transaction_id: "0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074",
        output_index: 0n,
    }, OutputReference);

    console.log(outputRef.toCbor())

    const datumTag = Data.to(blake2b_256(HexBlob.fromBytes(
        Buffer.from(outputRef.toCbor(), "hex")
    )), Data.Bytes());

    console.log(datumTag.toCbor());

    const borrowDetails = Data.to({
        lender: Data.to({
            paymentCredential: Data.to({ keyHash: loan.lender.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: loan.lender.asBase()?.getStakeCredential().hash! }, DatumCredential) } }
        }, DatumAddress),
        borrower: Data.to({
            paymentCredential: Data.to({ keyHash: borrowerAddr.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: { Inline: { credential: Data.to({ keyHash: borrowerAddr.asBase()?.getStakeCredential().hash! }, DatumCredential) } }
        }, DatumAddress),
        collateralDetails: Data.to({
            policyId: loan.collateral.policyId,
            assetName: loan.collateral.assetName,
            collateralAmount: loan.collateral.amount,
        }, CollateralDetails),
        loanAmount: loan.amount,
        interestAmount: loan.interestAmount,
        loanEndTime: loan.duration,
        levvyType: Tokens,
        tag: datumTag
    }, BorrowDetails);

    const borrowDatum = Data.to({
        BorrowDatum: { borrowDetails }
    }, LevvyDatum);

    const borrowAction = Data.to({
        inputIndex: 0n,
        outputIndexes: Data.to({
            selfOutputIndex: 0n,
            feeOutputIndex: 1n,
            changeIndex: null,
        }, OutputIndexes),
        actionType: Data.to({ BorrowAction: { type: Tokens } }, ActionType),
    }, Action);

    const withdrawRedeemer = Data.to([borrowAction], WithdrawRedeemer);

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet)

    // const borrowTx = await blaze
    //     .newTransaction()
    //     .addInput(lockedUtxo[0], Data.void())
    //     .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
    //     .lockAssets(
    //         validatorAddr,
    //         createValue(
    //             2_000_000n,
    //             PolicyId(loan.collateral.policyId),
    //             AssetName(loan.collateral.assetName),
    //             loan.collateral.amount
    //         ),
    //         borrowDatum
    //     )
    //     .payLovelace(
    //         platformAddr,
    //         platformFee * 2n,
    //         datumTag
    //     )
    //     .setValidFrom(Slot(0))
    //     .provideScript(script)
    //     .complete();

    // const signedTx = await blaze.signTransaction(borrowTx);
    // const txId = await blaze.provider.postTransactionToChain(signedTx);
    // console.log("Transaction Id", txId);
}

// Repay the borrowed position to the owner
async function repay(
    loan: LoanInput,
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    script: Script
) {
    // Locked Output Reference
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("3720e1951f659dfd05f5af59e2da2c40197f6141e89f894ac1940525e61f26d5"),
            0n
        )
    ]);

    const outputRef = Data.to({
        transaction_id: "3720e1951f659dfd05f5af59e2da2c40197f6141e89f894ac1940525e61f26d5",
        output_index: 0n,
    }, OutputReference);

    const datumTag = Data.to(blake2b_256(HexBlob.fromBytes(
        Buffer.from(outputRef.toCbor(), "hex")
    )), Data.Bytes());

    const repayAction = Data.to({
        inputIndex: 0n,
        outputIndexes: Data.to({
            selfOutputIndex: 0n,
            feeOutputIndex: null,
            changeIndex: null,
        }, OutputIndexes),
        actionType: Data.to({ RepayAction: { type: Data.to({ Tokens: Data.Object([]) }, LevvyType) } }, ActionType),
    }, Action);

    const withdrawRedeemer = Data.to([repayAction], WithdrawRedeemer)

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    const repayTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .addRequiredSigner(Ed25519KeyHashHex(loan.lender.asBase()?.getPaymentCredential().hash!))
        .payLovelace(loan.lender, loan.amount + loan.interestAmount, datumTag)
        .provideScript(script)
        .setCollateralChangeAddress(loan.lender)
        .setValidFrom(Slot(0))
        .complete();

    const signedTx = await blaze.signTransaction(repayTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Foreclose the borrowed position
async function foreclose(
    loan: LoanInput,
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    script: Script
) {
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("ac14bceb3c5762b6e195a9a242433a0c86c5f61d6db1b47fc91e36c708f37084"),
            0n
        )
    ]);

    const forecloseAction = Data.to({
        inputIndex: 1n,
        outputIndexes: Data.to({
            selfOutputIndex: 0n,
            feeOutputIndex: null,
            changeIndex: null,
        }, OutputIndexes),
        actionType: Data.to({ ForecloseAction: { type: Tokens } }, ActionType),
    }, Action);

    const withdrawRedeemer = Data.to([forecloseAction], WithdrawRedeemer);

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    const forecloseTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .payAssets(
            loan.lender,
            createValue(
                2_318_780n,
                PolicyId("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
                AssetName("434e4354"),
                2_000n
            )
        )
        .setValidFrom(Slot(Number(loan.duration + 1n)))
        .setCollateralChangeAddress(loan.lender)
        .provideScript(script)
        .complete();

    const signedTx = await blaze.signTransaction(forecloseTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Cancel a Lend Position from the contract
async function cancel(
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    script: Script,
    platformAddr: Address,
    ownerWallet: HotWallet
) {
    const lockedUtxos = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("0ad7a631e3d1b7328f1e3128f5af4cd2c63e64a90cecc984667f5f8528491074"),
            0n
        )
    ]);

    const scriptUtxos = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("97773a4f7940025dfffbe4e26d970cdc94205ed8aa241232afb43a2c04f7b126"),
            0n
        )
    ]);

    const outputIndexes = Data.to({
        selfOutputIndex: 0n,
        feeOutputIndex: null,
        changeIndex: null,
    }, OutputIndexes);

    const actionType = Data.to({
        CancelAction: { type: Data.to({ Tokens: Data.Object([]) }, LevvyType) }
    }, ActionType);

    const cancelAction = Data.to({
        inputIndex: 0n,
        outputIndexes,
        actionType,
    }, Action);

    const withdrawRedeemer = Data.to([cancelAction], WithdrawRedeemer);

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    const cancelTx = await blaze
        .newTransaction()
        .addInput(lockedUtxos[0], Data.void())
        .addReferenceInput(scriptUtxos[0])
        .addRequiredSigner(Ed25519KeyHashHex(ownerWallet.address.asBase()?.getPaymentCredential().hash!))
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .payLovelace(platformAddr, 2_000_000n)
        .complete();

    const signedTx = await blaze.signTransaction(cancelTx);
    console.log(signedTx.toCbor());
    // const txId = await blaze.provider.postTransactionToChain(signedTx);
    // console.log("Transaction Id", txId);
}

// Register stake credential
async function registerCredential(blaze: Blaze<Kupmios, HotWallet>, script: Script) {
    const registerTx = await blaze
        .newTransaction()
        .addRegisterStake(
            Credential.fromCore({
                type: CredentialType.ScriptHash,
                hash: script.hash()
            })
        )
        .complete();

    const signedTx = await blaze.signTransaction(registerTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Deploy script reference to a UTxO
async function deployScriptToContract(blaze: Blaze<Kupmios, HotWallet>, script: Script, validatorAddr: Address) {
    const deployScriptTx = await blaze
        .newTransaction()
        .deployScript(script, validatorAddr)
        .complete();

    const signedTx = await blaze.signTransaction(deployScriptTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Mint a token
async function mint(blaze: Blaze<Blockfrost, HotWallet>, walletAddr: Address, mintingScript: Script) {
    const policyId = PolicyId("0d85a956ba19b06f15d74d96c94146dc3f7ec95b64123e397b8f8fe5");
    const assetName = AssetName("54455354455253");

    const assetId = AssetId.fromParts(policyId, assetName);

    const tokenMapper: TokenMap = new Map<AssetId, bigint>();
    const assetMapper = new Map<AssetName, bigint>();

    const token = tokenMapper.set(assetId, 5_000n);
    const asset = assetMapper.set(assetName, 5_000n);

    const txOutput = new TransactionOutput(walletAddr, new Value(5_000_000n, token))

    const mintTx = await blaze
        .newTransaction()
        .addMint(policyId, asset, Data.void())
        .provideScript(mintingScript)
        .addOutput(txOutput)
        .complete();

    const signedTx = await blaze.signTransaction(mintTx);

    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

async function evalTx(
    provider: Kupmios,
    wallet: HotWallet
) {
    const blaze = await Blaze.from(provider, wallet);
    const txCbor =
      "84aa00d901028482582025e615156cd9e10be59d9a17776ef7958d46d1f57919a5fc58a616902f0e185c0082582025e615156cd9e10be59d9a17776ef7958d46d1f57919a5fc58a616902f0e185c01825820648ed7df24334a94c7d3d795bb1f2496c9c0a40fbc7a9bca249afa0f1451267200825820648ed7df24334a94c7d3d795bb1f2496c9c0a40fbc7a9bca249afa0f14512672010182a300581d70fa74d35f4b0d48ac6288ac5cea71f28e807565ad09845232f229660f011a007a1200028201d818588ed87b81d87986d87981d87981581c8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882dd87981d87981581c8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882dd8798340401a004c4b40d8798340401a004c4b40d8798340401a002dc6c058208ab79db52ebba38fe9b4edfbcd0f3a837ac25a35871961db074d9c8010d4c4f7825839008d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882df38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c821b000000013d35a51ea4581c0d85a956ba19b06f15d74d96c94146dc3f7ec95b64123e397b8f8fe5a14754455354455253191324581c8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0a144434e43541a00020f58581cc2e24d97d08a18b175ca87c03493bbef0262992d64c190e4edb32c20a14954657374546f6b656e191388581cdef68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088eaa147706172616d73311901f1021a00097f9105a1581df02e822c34a4d90a7b79a3755ffc20706ea0f7676d201398abd5763a02000b5820b4d5450a328efe2a53c89fcde2ba970440c0dc9731f93974a79e3883d44311210dd901028182582043bab144f56cb9883195fd88a6ac317c33105ca1cb8f4c06efa95a5b2eff9dd6010ed9010281581c8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d10825839008d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882df38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c1ab1d2ea92111a000e3f5a12d90102828258202e9a2f7ff63a0445b91f9ad68736a6567cc299df220921e420a27e52f16bcd03008258205d84910a2e0ece53b64fe2bf0f0d3cdc8f32993d3a5b3fee7c15a8e237fc9e1600a200d9010281825820161b5f43c774b4eb37c1e74c38e6e6128924df5072197d8d6d5aabf75a51ec6c5840a02f0c176c5a3acc33ec86736317280eb7692bc10a1937b90d202eea73a49573ec56127327c2734e487b141b354ebdf72b16f0a75e3258f741ca39af2d4cc30f05a282000082d87981d87985d8798200d87a80d8798100d87a80d8798400d87a80d87a80d87a80d87980821a00155cc01a05f5e1008203008281d87982582025e615156cd9e10be59d9a17776ef7958d46d1f57919a5fc58a616902f0e185c00821a00155cc01a3b9aca00f5f6";
  
    const utxos: TransactionInput[] = [
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "25e615156cd9e10be59d9a17776ef7958d46d1f57919a5fc58a616902f0e185c",
              "hex"
            )
          )
        ),
        0n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "25e615156cd9e10be59d9a17776ef7958d46d1f57919a5fc58a616902f0e185c",
              "hex"
            )
          )
        ),
        1n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "648ed7df24334a94c7d3d795bb1f2496c9c0a40fbc7a9bca249afa0f14512672",
              "hex"
            )
          )
        ),
        0n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "648ed7df24334a94c7d3d795bb1f2496c9c0a40fbc7a9bca249afa0f14512672",
              "hex"
            )
          )
        ),
        1n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "43bab144f56cb9883195fd88a6ac317c33105ca1cb8f4c06efa95a5b2eff9dd6",
              "hex"
            )
          )
        ),
        1n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "2e9a2f7ff63a0445b91f9ad68736a6567cc299df220921e420a27e52f16bcd03",
              "hex"
            )
          )
        ),
        0n
      ),
      new TransactionInput(
        TransactionId.fromHexBlob(
          HexBlob.fromBytes(
            Buffer.from(
              "5d84910a2e0ece53b64fe2bf0f0d3cdc8f32993d3a5b3fee7c15a8e237fc9e16",
              "hex"
            )
          )
        ),
        0n
      ),
      
    ];
  
    const resolvedUtxos = await provider.resolveUnspentOutputs(utxos);
  
    const tx = Core.Transaction.fromCbor(txCbor as TxCBOR);
  
    const evalTx = await blaze.provider.evaluateTransaction(tx, resolvedUtxos);
  
    console.log(evalTx.toCore());
  }

main();