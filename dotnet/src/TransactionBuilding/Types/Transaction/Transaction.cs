namespace TransactionBuilding.Types.Transaction;

public class Transaction
{
    public byte[] Bytes { get; set; }

    public Transaction() 
    {
        Bytes = [];
    }

    public Transaction(byte[] cborBytes)
    {
        Bytes = cborBytes;
    }
}