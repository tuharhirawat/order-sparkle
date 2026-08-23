using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class ProductImage
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public string Url { get; set; } = null!;

    public string? Alt { get; set; }

    public int Position { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;
}
