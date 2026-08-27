using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class OrderNote
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public string Note { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public virtual Order Order { get; set; } = null!;
}
