
namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class CreateCategoryRequestDto
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public IFormFile? Image { get; set; }
    }
}
