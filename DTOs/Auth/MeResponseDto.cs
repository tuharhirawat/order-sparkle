namespace MamtasImitationJewelleryBE.DTOs.Auth
{
    public class MeResponseDto
    {
        public Guid UserId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string? MobileNumber { get; set; }

        public bool IsAdmin { get; set; }

        public bool IsOwner { get; set; }

        public bool AnyAdminExists { get; set; }
    }
}
