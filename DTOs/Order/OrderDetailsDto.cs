namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class OrderTransitionDto
    {
        public string Field { get; set; } = null!;
        public string FromValue { get; set; } = null!;
        public string ToValue { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public string? ChangedBy { get; set; }
    }

    public class OrderNoteDto
    {
        public Guid Id { get; set; }
        public string Note { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }

    public class OrderPaymentResponseDto
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OrderDetailsResponseDto : AdminOrderResponseDto
    {
        public List<OrderPaymentResponseDto> Payments { get; set; } = new();
        public List<OrderTransitionDto> History { get; set; } = new();
        public List<OrderNoteDto> Notes { get; set; } = new();
    }
}