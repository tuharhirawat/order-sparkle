namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class CreateOrderItemRequestDto
    {
        public Guid ProductId { get; set; }

        public Guid? VariantId { get; set; }

        public int Quantity { get; set; }
    }

    public class CreateOrderCustomerRequestDto
    {
        public string FullName { get; set; } = null!;

        public string Phone { get; set; } = null!;

        public string? Email { get; set; }

        public string Line1 { get; set; } = null!;

        public string City { get; set; } = null!;

        public string State { get; set; } = null!;

        public string Pincode { get; set; } = null!;

        public string? Note { get; set; }
    }

    public class CreateOrderRequestDto
    {
        public string IdempotencyKey { get; set; } = null!;

        public CreateOrderCustomerRequestDto Customer { get; set; } = null!;

        public List<CreateOrderItemRequestDto> Items { get; set; } = new();
    }
}