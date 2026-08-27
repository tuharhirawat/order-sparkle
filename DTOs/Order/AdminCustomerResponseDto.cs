namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class AdminCustomerResponseDto
    {
        public Guid ProfileId { get; set; }

        public string FullName { get; set; } = null!;

        public string Phone { get; set; } = null!;

        public string? Email { get; set; }

        public DateTime FirstSeen { get; set; }

        public int OrdersCount { get; set; }

        public decimal TotalValue { get; set; }
    }
}
