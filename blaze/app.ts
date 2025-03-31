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
    TransactionId,
    TransactionInput,
    TransactionOutput,
    Value,
    wordlist,
} from "@blaze-cardano/core";
import { Unwrapped } from "@blaze-cardano/ogmios";
import { HotWallet, Blaze, Data, Blockfrost, Kupmios } from "@blaze-cardano/sdk";
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
import { AlwaysTrueAction, AlwaysTrueIndexes, AlwaysTrueTuple, AlwaysTrueWithdrawRedeemer } from "./lib/schema";

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

    console.log(script.hash());

    const validatorAddress = addressFromValidator(NetworkId.Testnet, script);
    const platformAddress = Address.fromBech32(process.env["PLATFORM_ADDRESS"]!);
    const borrowerAddress = Address.fromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");
    const receiverAddress = Address.fromBech32("addr_test1qqd86cnx53kdhyhwyu9czgmhkuucyevhp2ez7vxu3zkfa5vudpnr948a9kje6sqqqe5ear3wq260zns6q9ketpfl3jwq4vhh0k");

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    // Modify your loan input here
    const loan: LoanInput = {
        lender: kupmiosWallet.address,
        amount: 5_000_000n,
        interestAmount: 3_000_000n,
        duration: 74386826n,
        collateral: {
            policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
            assetName: "434e4354",
            amount: 3_000n
        }
    }

    // await deployScriptToContract(kupmiosBlaze, script, validatorAddress);
    // await registerCredential(kupmiosBlaze, script);
    // await sendLovelace(blockfrostBlaze, receiverAddress);
    // await lend(loan, kupmiosBlaze, validatorAddress);
    // await borrow(loan, blockfrostBlaze, borrowerAddress, validatorAddress, platformAddress, script);
    // await repay(loan, blockfrostBlaze, script);
    // await foreclose(loan, blockfrostBlaze, script);

    // // await lockTx(kupmiosBlaze, validatorAddress);
    // // await swapTx(kupmiosBlaze, rewardAccount);
}

async function lockTx(blaze: Blaze<Blockfrost | Kupmios, HotWallet>, validatorAddress: Address) {
    const lockTx = await blaze
        .newTransaction()
        .lockLovelace(validatorAddress, 6_000_000n, Data.void())
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
            TransactionId("d8c659063d32ec684379c04b57128a9393fd6c40aed7d52764faa85d47d8304c"),
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
            stakeCredential: null
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
            TransactionId("0e2125de597b5467a69eefc5f053fe86f305bd5ce9be42991742ab6bbaaf64d0"),
            0n
        )
    ]);

    const platformFee = calculatePlatformFee(loan.interestAmount, tokenFeePercent);

    const outputRef = Data.to({
        transaction_id: "0e2125de597b5467a69eefc5f053fe86f305bd5ce9be42991742ab6bbaaf64d0",
        output_index: 0n,
    }, OutputReference);

    const datumTag = Data.to(blake2b_256(HexBlob.fromBytes(
        Buffer.from(outputRef.toCbor(), "hex")
    )), Data.Bytes());

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

    const borrowTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .lockAssets(
            validatorAddr,
            createValue(
                2_000_000n,
                PolicyId(loan.collateral.policyId),
                AssetName(loan.collateral.assetName),
                loan.collateral.amount
            ),
            borrowDatum
        )
        .payLovelace(
            platformAddr,
            platformFee * 2n,
            datumTag
        )
        .setValidFrom(Slot(0))
        .provideScript(script)
        .complete();

    const signedTx = await blaze.signTransaction(borrowTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
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
            TransactionId("16d8d8a3f4f51aebf30a1acacd6054a7e4425d1338c523a282d60ee5c638a115"),
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
        .addRequiredSigner(Ed25519KeyHashHex(ownerWallet.address.asBase()?.getPaymentCredential().hash!))
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .payLovelace(platformAddr, 2_000_000n)
        .provideScript(script)
        .complete();

    const signedTx = await blaze.signTransaction(cancelTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
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

main();