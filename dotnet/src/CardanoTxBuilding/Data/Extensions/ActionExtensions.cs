using Action = CardanoTxBuilding.Data.Enums.Action;

namespace CardanoTxBuilding.Data.Extensions;

public static class ActionExtensions
{
    public static int GetActionType(this Action self) =>
        self switch
        {
            Action.Swap => 121,
            Action.Cancel => 122,
            _ => 121
        };
}