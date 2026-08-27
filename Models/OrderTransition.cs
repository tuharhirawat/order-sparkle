using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class OrderTransition
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public string Field { get; set; } = null!;

    public string FromValue { get; set; } = null!;

    public string ToValue { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string? ChangedBy { get; set; }

    public virtual Order Order { get; set; } = null!;
}
