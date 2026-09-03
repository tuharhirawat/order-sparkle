namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class ProductResponseDto
    {
        public Guid Id { get; set; }
        public string ProductCode { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string UrlName { get; set; } = null!;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal DisplayPrice { get; set; }
        public decimal? OriginalPrice { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public string? Material { get; set; }
        public string? Details { get; set; }
        public int Stock { get; set; }
        public bool TrackStock { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsNew { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public CategoryResponseDto? Category { get; set; }
        public List<ProductImageResponseDto> ProductImages { get; set; } = [];
        public List<ProductVariantResponseDto> ProductVariants { get; set; } = [];
    }

    public class CategoryResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string UrlName { get; set; } = null!;
        public string? ImageUrl { get; set; }
        public string Initials { get; set; } = null!;
    }

    public class ProductImageResponseDto
    {
        public Guid Id { get; set; }
        public string Url { get; set; } = null!;
        public int Position { get; set; }
    }

    public class ProductVariantResponseDto
    {
        public Guid Id { get; set; }
        public string Label { get; set; } = null!;
        public string? VariantCode { get; set; }
        public decimal PriceDelta { get; set; }
        public int Stock { get; set; }
        public bool IsActive { get; set; }
        public int Position { get; set; }
    }
}