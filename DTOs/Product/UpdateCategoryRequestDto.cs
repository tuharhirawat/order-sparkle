namespace MamtasImitationJewelleryBE.DTOs.Product
{
    public class UpdateCategoryRequestDto
    {
        public string? Description { get; set; }
        public bool ManageImage { get; set; }
        public IFormFile? Image { get; set; }
        public bool RemoveImage { get; set; }
    }
}