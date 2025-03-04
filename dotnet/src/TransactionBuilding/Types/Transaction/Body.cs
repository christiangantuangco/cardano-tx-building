using Chrysalis.Cbor.Attributes;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Input;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Output;
using Chrysalis.Cbor.Serialization.Converters.Custom;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Types.Custom;
using Chrysalis.Cbor.Types.Primitives;

namespace TransactionBuilding.Types.Transaction;

[CborConverter(typeof(CustomMapConverter))]
[CborOptions(IsDefinite = true)]
public record TransactionBody(
    [CborIndex(0)] CborDefListWithTag<TransactionInput> Inputs,
    [CborIndex(1)] CborDefList<TransactionOutput> Outputs,
    [CborIndex(2)] CborUlong Fee
) : CborBase;