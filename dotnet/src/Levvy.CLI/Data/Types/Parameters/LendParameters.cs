using Chrysalis.Cbor.Types.Cardano.Core.Common;

namespace Levvy.CLI.Data.Types.Parameters;

public record LendParameters(
    Value Amount,
    DatumOption LendDatum
);
