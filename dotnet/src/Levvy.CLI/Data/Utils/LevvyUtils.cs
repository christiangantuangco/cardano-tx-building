namespace Levvy.CLI.Data.Utils;


public static class LevvyUtils
{
    public const ulong TOKEN_FEE_PERCENT = 125;
    public const ulong NFT_FEE_PERCENT = 25;
    public static ulong CalculatePlatformFee(ulong amount, ulong feePercent) => amount * feePercent / 1000;
}