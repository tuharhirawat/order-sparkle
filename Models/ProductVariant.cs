using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class ProductVariant
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public string Label { get; set; } = null!;

    public string? VariantCode { get; set; }

    public decimal PriceDelta { get; set; }

    public int Stock { get; set; }

    public bool IsActive { get; set; }

    public int Position { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
