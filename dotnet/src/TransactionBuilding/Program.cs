using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Input;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Output;
using Chrysalis.Cbor.Types.Primitives;
using TransactionBuilding.Extensions.Transcation;
using TransactionBuilding.Types.Transaction;

Address senderAddress = new(Convert.FromHexString("008d775cd4e9397c2359f1b1c491ebee8541281abba5f3ed432e37882df38fd378b75df6519f23214cee2520d3da870611be24d093f8f6af9c"));
Address receiverAddress = new(Convert.FromHexString("001a7d6266a46cdb92ee270b812377b7398265970ab22f30dc88ac9ed19c686632d4fd2da59d400006699e8e2e02b4f14e1a016d95853f8c9c"));
Value lovelace = new Lovelace(5_000_000);

TransactionInput input1 = new(
    new CborBytes(Convert.FromHexString("3f3a8c1da574b467e63cd5e8d06ac998b10ee4b20be61fbe94c54f8d0fdedaec")),
    new CborUlong(3)
);

PostAlonzoTransactionOutput output1 = new PostAlonzoTransactionOutput(
    receiverAddress,
    lovelace,
    null,
    null
);

CborUlong fee = new(1_000_000);

PostAlonzoTransactionOutput changeOutput = new PostAlonzoTransactionOutput(
    senderAddress,
    new Lovelace(16_089_293 - 5_000_000 - fee.Value),
    null,
    null
);

Transaction tx = new Transaction()
    .AddInput(input1)
    .AddOutput(output1)
    .AddOutput(changeOutput)
    .SetFee(fee);

Console.WriteLine(Convert.ToHexString(tx.Bytes));