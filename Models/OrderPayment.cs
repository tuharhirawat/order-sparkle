using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class OrderPayment
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public decimal Amount { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
}
