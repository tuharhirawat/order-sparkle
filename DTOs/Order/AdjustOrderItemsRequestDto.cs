namespace MamtasImitationJewelleryBE.DTOs.Order
{
    public class AdjustOrderItemsRequestDto
    {
        public List<OrderItemQuantityDto> Items { get; set; } = new();
    }

    public class OrderItemQuantityDto
    {
        public Guid OrderItemId { get; set; }
        public int Quantity { get; set; }
    }
}
