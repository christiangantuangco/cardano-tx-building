using ChrysalisTransaction = Chrysalis.Cbor.Cardano.Types.Block.Transaction.Transaction;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Body;
using Transaction = TransactionBuilding.Types.Transaction.Transaction;
using Chrysalis.Cbor.Serialization;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction;
using Chrysalis.Cbor.Types.Custom;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Input;
using Chrysalis.Cbor.Cardano.Types.Block.Transaction.Output;
using Chrysalis.Cbor.Types.Primitives;

namespace TransactionBuilding.Extensions.Transcation.Body;

public static class TransactionExtension
{
    public static TransactionBody TransactionBody(this Transaction self)
    {
        if (self.Bytes.ToList().Count <= 0)
        {
            return new ConwayTransactionBody(
                    new CborDefListWithTag<TransactionInput>([]),
                    new CborDefList<TransactionOutput>([]),
                    new(default),
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
                    new([]),
                    null,
                    null,
                    null
            );
        }
        else
        {
            ChrysalisTransaction tx = CborSerializer.Deserialize<ChrysalisTransaction>(self.Bytes);

            return tx switch
            {
                ShelleyTransaction shelleyTx => shelleyTx.TransactionBody,
                AllegraTransaction allegraTx => allegraTx.TransactionBody,
                PostMaryTransaction postMaryTx => postMaryTx.TransactionBody,
                _ => throw new NotImplementedException()
            };
        }
    }

    public static CborUlong Fee(this Transaction self)
    {
        if (self.Bytes.ToList().Count <= 0)
        {
            return new(0);
        }
        else
        {
            TransactionBody txBody = self.TransactionBody();

            return txBody switch
            {
                AlonzoTransactionBody alonzoTxBody => alonzoTxBody.Fee,
                BabbageTransactionBody babbageTxBody => babbageTxBody.Fee,
                ConwayTransactionBody conwayTxBody => conwayTxBody.Fee,
                _ => throw new NotImplementedException()
            };
        }
    }
}