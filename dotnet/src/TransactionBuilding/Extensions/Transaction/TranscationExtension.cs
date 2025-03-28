using Transaction = TransactionBuilding.Types.Transaction.Transaction;
using TransactionBuilding.Extensions.Transcation.Body;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types;
using Chrysalis.Cbor.Extensions.Cardano.Core.Transaction.Body;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;

namespace TransactionBuilding.Extensions.Transcation;

public static class TransactionExtension
{
    public static Transaction AddInput(this Transaction self, TransactionInput input)
    {
        TransactionBody txBody = self.TransactionBody();
        List<TransactionInput> inputs = [.. txBody.Inputs(), input];

        ConwayTransactionBody conwayTxBody = new(
            new CborDefListWithTag<TransactionInput>(inputs),
            new CborDefList<TransactionOutput>([.. txBody.Outputs()]),
            self.Fee(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );

        PostMaryTransaction postMaryTx = new(
            conwayTxBody,
            new PostAlonzoTransactionWitnessSet(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            ),
            new(true),
            new(default)
        );

        return new(postMaryTx.ToBytes()!);
    }

    public static Transaction AddOutput(this Transaction self, TransactionOutput output)
    {
        TransactionBody txBody = self.TransactionBody();
        List<TransactionOutput> outputs = [.. txBody.Outputs(), output];

        ConwayTransactionBody conwayTxBody = new(
            new CborDefListWithTag<TransactionInput>([.. txBody.Inputs()]),
            new CborDefList<TransactionOutput>(outputs),
            self.Fee(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );

        PostMaryTransaction postMaryTx = new(
            conwayTxBody,
            new PostAlonzoTransactionWitnessSet(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            ),
            new(true),
            new(default)
        );

        return new(postMaryTx.ToBytes()!);
    }

    public static Transaction SetFee(this Transaction self, CborUlong fee)
    {
        TransactionBody txBody = self.TransactionBody();

        ConwayTransactionBody conwayTxBody = new(
            new CborDefListWithTag<TransactionInput>([.. txBody.Inputs()]),
            new CborDefList<TransactionOutput>([.. txBody.Outputs()]),
            fee,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );

        PostMaryTransaction postMaryTx = new(
            conwayTxBody,
            new PostAlonzoTransactionWitnessSet(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            ),
            new(true),
            new(default)
        );

        return new(postMaryTx.ToBytes()!);
    }
}