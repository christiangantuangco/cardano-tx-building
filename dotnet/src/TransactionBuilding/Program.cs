using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Input;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Output;
using Chrysalis.Cbor.Serialization;
using Chrysalis.Cbor.Types.Custom;
using Chrysalis.Cbor.Types.Primitives;
using TransactionBuilding.Types.Transaction;

Address receiverAddress = new(Convert.FromHexString("001a7d6266a46cdb92ee270b812377b7398265970ab22f30dc88ac9ed19c686632d4fd2da59d400006699e8e2e02b4f14e1a016d95853f8c9c"));
Value lovelace = new Lovelace(5_000_000);

TransactionInput txInput = new(
    new CborBytes(Convert.FromHexString("3b6e19bd7cabaa650b4bd5d52d25874d1bf1bc53246cde3d975a0b21b196792b")),
    new CborUlong(0)
);

TransactionOutput txOutput = new PostAlonzoTransactionOutput(
    receiverAddress,
    lovelace,
    default,
    default
);

CborDefListWithTag<TransactionInput> inputs = new([txInput]);

TransactionBody txBody = new(
    Inputs: new([txInput]),
    Outputs: new([txOutput]),
    Fee: new(2_000_000)
);

string cborHex = Convert.ToHexString(CborSerializer.Serialize(txBody));

Console.Write(cborHex);