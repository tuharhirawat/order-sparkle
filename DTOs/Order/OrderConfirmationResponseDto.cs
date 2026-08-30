namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class OrderItemResponseDto
    {
        public string Name { get; set; } = null!;

        public string? VariantLabel { get; set; }

        public int Quantity { get; set; }

        public int? OriginalQuantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal LineTotal { get; set; }

        public string? ImageUrl { get; set; }
    }

    public class OrderConfirmationResponseDto
    {
        public string OrderNumber { get; set; } = null!;

        public decimal Total { get; set; }

        public string CustomerName { get; set; } = null!;

        public string AddressLine { get; set; } = null!;

        public string City { get; set; } = null!;

        public string State { get; set; } = null!;

        public string Pincode { get; set; } = null!;

        public string? Note { get; set; }

        public List<OrderItemResponseDto> Items { get; set; } = new();
    }

    public class MyOrderResponseDto
    {
        public string OrderNumber { get; set; } = null!;

        public DateTime CreatedAt { get; set; }

        public string Status { get; set; } = null!;

        public string? PaymentStatus { get; set; }

        public decimal AmountPaid { get; set; }

        public decimal AmountPending { get; set; }

        public decimal Total { get; set; }

        public string ShipCity { get; set; } = null!;

        public string ShipState { get; set; } = null!;

        public string ShipPincode { get; set; } = null!;

        public string ShipLine1 { get; set; } = null!;

        public string? Note { get; set; }

        public List<OrderItemResponseDto> Items { get; set; } = new();
    }
}
