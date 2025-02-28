import {
    Address,
    addressFromCredential,
    AssetId,
    AssetName,
    Bip32PrivateKey,
    blake2b_256,
    Credential,
    CredentialType,
    Ed25519KeyHashHex,
    Hash28ByteBase16,
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
import { HotWallet, Blaze, Data, Blockfrost, Kupmios, Wallet } from "@blaze-cardano/sdk";
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
    WithdrawRedeemer
} from "./lib/types";

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

    const validatorAddr = Address.fromBech32(process.env["VALIDATOR_ADDRESS"]!);
    const platformAddr = Address.fromBech32(process.env["PLATFORM_ADDRESS"]!);
    const borrowerAddr = Address.fromBech32("addr_test1qzxhwhx5ayuhcg6e7xcufy0ta6z5z2q6hwjl8m2r9cmcst0n3lfh3d6a7ege7gepfnhz2gxnm2rsvyd7yngf878k47wqjrmaqk");

    const rewardAccount = RewardAccount.fromCredential({
        type: CredentialType.ScriptHash,
        hash: script.hash()
    }, NetworkId.Testnet);

    // lend(10_000_000n, 3_000_000n, 74119199n, kupmiosBlaze, kupmiosWallet, validatorAddr);
    // borrow(blockfrostBlaze, rewardAccount, blockfrostWallet, borrowerAddr, validatorAddr, platformAddr, script);
    // repay(blockfrostBlaze, rewardAccount, blockfrostWallet, borrowerAddr, script);
    // foreclose(blockfrostBlaze, rewardAccount, blockfrostWallet, script);
}

// Lock a lend position to smart contract
async function lend(
    loanAmount: bigint,
    interestAmount: bigint,
    loanDuration: bigint,
    blaze: Blaze<Blockfrost | Kupmios, HotWallet>,
    ownerWallet: HotWallet,
    validatorAddr: Address
) {
    const lendDetails = Data.to({
        lender: Data.to({
            paymentCredential: Data.to({ keyHash: ownerWallet.address.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: null
        }, DatumAddress),
        collateralDetails: Data.to({
            policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
            assetName: "434e4354",
            collateralAmount: 2_000n,
        }, CollateralDetails),
        loanAmount,
        interestAmount,
        loanDuration,
        levvyType: Tokens,
    }, LendDetails);

    const platformFee = calculatePlatformFee(interestAmount, tokenFeePercent);

    const lendDatum = Data.to({
        LendDatum: { lendDetails }
    }, LevvyDatum);

    const lockTx = await blaze
        .newTransaction()
        .lockLovelace(
            validatorAddr, 
            loanAmount + platformFee,
            lendDatum
        )
        .complete();

    const signedTx = await blaze.signTransaction(lockTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Borrow a lend position from Smart Contract
async function borrow(
    blaze: Blaze<Blockfrost, HotWallet>,
    rewardAccount: RewardAccount,
    ownerWallet: HotWallet, 
    borrowerAddr: Address,
    validatorAddr: Address,
    platformAddr: Address,
    script: Script
) {
    // Locked Output Reference
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("4dade70a2ee0be547ecdeb2114804942c102c07e46df3c155c88af9daf6e54c7"),
            0n
        )
    ]);

    const platformFee = calculatePlatformFee(10_000_000n, tokenFeePercent);

    const outputRef = Data.to({
        transaction_id: "4dade70a2ee0be547ecdeb2114804942c102c07e46df3c155c88af9daf6e54c7",
        output_index: 0n,
    }, OutputReference);

    const datumTag = Data.to(blake2b_256(HexBlob.fromBytes(
        Buffer.from(outputRef.toCbor(), "hex")
    )), Data.Bytes());

    const borrowDetails = Data.to({
        lender: Data.to({
            paymentCredential: Data.to({ keyHash: ownerWallet.address.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: null
        }, DatumAddress),
        borrower: Data.to({
            paymentCredential: Data.to({ keyHash: borrowerAddr.asBase()?.getPaymentCredential().hash! }, DatumCredential),
            stakeCredential: null
        }, DatumAddress),
        collateralDetails: Data.to({
            policyId: "8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0",
            assetName: "434e4354",
            collateralAmount: 2_000n,
        }, CollateralDetails),
        loanAmount: 10000000n,
        interestAmount: 5000000n,
        loanEndTime: 74115971n,
        levvyType: Tokens,
        tag: datumTag
    }, BorrowDetails);

    const borrowDatum = Data.to({
        BorrowDatum: { borrowDetails }
    }, LevvyDatum);

    const borrowAction = Data.to({
        inputIndex: 1n,
        outputIndexes: Data.to({
            selfOutputIndex: 0n,
            feeOutputIndex: 1n,
            changeIndex: null,
        }, OutputIndexes),
        actionType: Data.to({ BorrowAction: { type: Tokens } }, ActionType),
    }, Action);

    const withdrawRedeemer = Data.to([borrowAction], WithdrawRedeemer);

    const borrowTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .lockAssets(
            validatorAddr,
            createValue(
                2_000_000n,
                PolicyId("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
                AssetName("434e4354"),
                2_000n
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
    blaze: Blaze<Blockfrost, HotWallet>,
    rewardAccount: RewardAccount,
    ownerWallet: HotWallet,
    borrowerAddr: Address,
    script: Script
) {
    // Owner address of the asset borrowed
    const ownerAddress = addressFromCredential(
        NetworkId.Testnet,
        Credential.fromCore({
            type: CredentialType.KeyHash,
            hash: Hash28ByteBase16("8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d")
        })
    );

    // Locked Output Reference
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("3f3a8c1da574b467e63cd5e8d06ac998b10ee4b20be61fbe94c54f8d0fdedaec"),
            0n
        )
    ]);

    const outputRef = Data.to({
        transaction_id: "3f3a8c1da574b467e63cd5e8d06ac998b10ee4b20be61fbe94c54f8d0fdedaec",
        output_index: 0n,
    }, OutputReference);

    const datumTag = Data.to(blake2b_256(HexBlob.fromBytes(
        Buffer.from(outputRef.toCbor(), "hex")
    )), Data.Bytes());

    const repayAction = Data.to({
        inputIndex: 1n,
        outputIndexes: Data.to({
            selfOutputIndex: 0n,
            feeOutputIndex: null,
            changeIndex: null,
        }, OutputIndexes),
        actionType: Data.to({ RepayAction: { type: Data.to({ Tokens: Data.Object([]) }, LevvyType) } }, ActionType),
    }, Action);

    const withdrawRedeemer = Data.to([repayAction], WithdrawRedeemer)

    const repayTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .addRequiredSigner(Ed25519KeyHashHex(borrowerAddr.asBase()?.getPaymentCredential().hash!))
        .payLovelace(ownerAddress, 20000000n + 10000000n, datumTag)
        .provideScript(script)
        .setCollateralChangeAddress(ownerWallet.address)
        .setValidFrom(Slot(0))
        .complete();

    const signedTx = await blaze.signTransaction(repayTx);
    const txId = await blaze.provider.postTransactionToChain(signedTx);
    console.log("Transaction Id", txId);
}

// Foreclose the borrowed position
async function foreclose(
    blaze: Blaze<Blockfrost, HotWallet>,
    rewardAccount: RewardAccount,
    ownerWallet: HotWallet,
    script: Script
) {
    const lockedUtxo = await blaze.provider.resolveUnspentOutputs([
        new TransactionInput(
            TransactionId("918bebfda0c4c74c8e3661394195a093e80541e851969976c05ae84a61c263f5"),
            0n
        )
    ]);

    const lenderAddr = addressFromCredential(
        NetworkId.Testnet,
        Credential.fromCore({
            type: CredentialType.KeyHash,
            hash: Hash28ByteBase16("8d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882d")
        })
    );

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

    const forecloseTx = await blaze
        .newTransaction()
        .addInput(lockedUtxo[0], Data.void())
        .addWithdrawal(rewardAccount, 0n, withdrawRedeemer)
        .payAssets(lenderAddr, createValue(
            2_000_000n, 
            PolicyId("8b05e87a51c1d4a0fa888d2bb14dbc25e8c343ea379a171b63aa84a0"),
            AssetName("434e4354"),
            2_000n
        ))
        .setValidFrom(Slot(74115972))
        .setCollateralChangeAddress(ownerWallet.address)
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