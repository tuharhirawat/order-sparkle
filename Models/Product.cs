using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class Product
{
    public Guid Id { get; set; }

    public string ProductCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string UrlName { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public decimal? CompareAtPrice { get; set; }

    public Guid? CategoryId { get; set; }

    public string? Material { get; set; }

    public string? Details { get; set; }

    public int Stock { get; set; }

    public bool TrackStock { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsNew { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Category? Category { get; set; }

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
}
