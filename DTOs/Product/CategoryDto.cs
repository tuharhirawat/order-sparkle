namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class CategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string UrlName { get; set; } = default!;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string Initials { get; set; } = default!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int ProductCount { get; set; }
    }
}
