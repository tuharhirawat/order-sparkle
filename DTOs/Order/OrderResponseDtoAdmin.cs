namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class AdminOrderItemResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Sku { get; set; }
        public string? VariantLabel { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class AdminOrderResponseDto
    {
        public Guid Id { get; set; }

        public string OrderNumber { get; set; } = null!;

        public DateTime CreatedAt { get; set; }

        public string Status { get; set; } = null!;

        public string? PaymentStatus { get; set; }

        public decimal Subtotal { get; set; }

        public decimal Total { get; set; }

        public decimal AmountPaid { get; set; }

        public decimal AmountPending { get; set; }

        public string ShipFullName { get; set; } = null!;

        public string ShipPhone { get; set; } = null!;

        public string? ShipEmail { get; set; }

        public string ShipLine1 { get; set; } = null!;

        public string ShipCity { get; set; } = null!;

        public string ShipState { get; set; } = null!;

        public string ShipPincode { get; set; } = null!;

        public string? CustomerNote { get; set; }

        public List<AdminOrderItemResponseDto> Items { get; set; } = new();
    }

    public class AdminOrderSummaryResponseDto
    {
        public Guid Id { get; set; }

        public string OrderNumber { get; set; } = null!;

        public DateTime CreatedAt { get; set; }

        public string Status { get; set; } = null!;

        public string? PaymentStatus { get; set; }

        public decimal Subtotal { get; set; }

        public decimal AmountPaid { get; set; }

        public decimal AmountPending { get; set; }

        public string ShipFullName { get; set; } = null!;

        public string ShipPhone { get; set; } = null!;

        public string? ShipEmail { get; set; }

        public string ShipCity { get; set; } = null!;

        public string ShipState { get; set; } = null!;
    }
}