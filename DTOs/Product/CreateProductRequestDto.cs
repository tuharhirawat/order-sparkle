namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class CreateProductRequestDto
    {
        public string Name { get; set; } = null!;
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public Guid? CategoryId { get; set; }
        public string? Description { get; set; }
        public string? Material { get; set; }
        public string? Details { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public bool TrackStock { get; set; } = true;
        public bool IsFeatured { get; set; }
        public List<IFormFile> Images { get; set; } = new();
    }
}
