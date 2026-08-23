using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class Category
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string UrlName { get; set; } = null!;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public int Position { get; set; }

    public bool IsActive { get; set; }

    public int LastProductNumber { get; set; } = 0;

    public string Prefix { get; set; } = default!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
