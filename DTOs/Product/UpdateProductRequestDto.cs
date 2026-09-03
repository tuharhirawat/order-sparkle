using Microsoft.AspNetCore.Http;

namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class UpdateProductRequestDto
    {
        public decimal? Price { get; set; }

        public decimal? CompareAtPrice { get; set; }

        public decimal? DiscountPercentage { get; set; }

        public int? Stock { get; set; }

        public bool? IsActive { get; set; }

        public bool? IsFeatured { get; set; }

        public string? Details { get; set; }

        public string? Name { get; set; }

        public string? Material { get; set; }

        public Guid? CategoryId { get; set; }

        public bool ManageImages { get; set; }

        public List<Guid>? ExistingImageIds { get; set; }

        public List<IFormFile>? Images { get; set; }
    }
}
