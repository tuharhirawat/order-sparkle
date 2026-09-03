namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class ProductSummaryResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string UrlName { get; set; } = default!;
        public decimal? DiscountPercentage { get; set; }
        public decimal DisplayPrice { get; set; }
        public decimal? OriginalPrice { get; set; }
        public decimal Price { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsNew { get; set; }
        public bool InStock { get; set; }
        public string? ThumbnailUrl { get; set; }
        public CategoryResponseDto? Category { get; set; }
    }
}