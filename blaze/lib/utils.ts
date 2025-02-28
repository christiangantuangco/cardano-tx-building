import {
    AssetId,
    AssetName,
    PolicyId,
    Value
} from "@blaze-cardano/core";

const tokenFeePercent = 125n;
const nftFeePercent = 25n;

function createValue(loveLace: bigint, policyId: PolicyId, assetName: AssetName, amount: bigint): Value {
    const assetId = AssetId.fromParts(policyId, assetName);

    const tokenMapper = new Map<AssetId, bigint>();
    const multiasset = tokenMapper.set(assetId, amount);

    return new Value(loveLace, multiasset);
}

function calculatePlatformFee(amount: bigint, feePercent: bigint) {
    return amount * feePercent / 1000n
}

export { 
    createValue, 
    calculatePlatformFee,
    tokenFeePercent,
    nftFeePercent,
}