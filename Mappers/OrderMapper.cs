using MamtasImitationJewelleryBE.DTOs.Order;
using MamtasImitationJewelleryBE.Models;

namespace MamtasImitationJewelleryBE.Mappers
{
    public class OrderMapper
    {
        public static AdminOrderResponseDto MapAdmin(Order o) => new()
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CreatedAt = o.CreatedAt,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus?.ToString(),
            Subtotal = o.Subtotal,
            Total = o.Total,
            AmountPaid = o.AmountPaid,
            AmountPending = Math.Max(0m, o.Total - o.AmountPaid),
            ShipFullName = o.CustomerDetails.FullName,
            ShipPhone = o.CustomerDetails.Phone,
            ShipEmail = o.CustomerDetails.Email,
            ShipLine1 = o.CustomerDetails.Line1,
            ShipCity = o.CustomerDetails.City,
            ShipState = o.CustomerDetails.State,
            ShipPincode = o.CustomerDetails.Pincode,
            CustomerNote = o.CustomerNote,
            Items = o.OrderItems.Select(i => new AdminOrderItemResponseDto
            {
                Id = i.Id,
                Name = i.ProductName,
                Sku = i.ProductSku,
                VariantLabel = i.VariantLabel,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal,
                ImageUrl = i.ImageUrl
            }).ToList()
        };

        public static AdminOrderSummaryResponseDto MapAdminOrderSummary(Order o) => new()
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CreatedAt = o.CreatedAt,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus?.ToString(),
            Subtotal = o.Subtotal,
            AmountPaid = o.AmountPaid,
            AmountPending = Math.Max(0m, o.Total - o.AmountPaid),
            ShipFullName = o.CustomerDetails.FullName,
            ShipPhone = o.CustomerDetails.Phone,
            ShipEmail = o.CustomerDetails.Email,
            ShipCity = o.CustomerDetails.City,
            ShipState = o.CustomerDetails.State,
        };

        public static OrderDetailsResponseDto MapDetails(Order o)
        {
            var admin = MapAdmin(o);
            return new OrderDetailsResponseDto
            {
                Id = admin.Id,
                OrderNumber = admin.OrderNumber,
                CreatedAt = admin.CreatedAt,
                Status = admin.Status,
                PaymentStatus = admin.PaymentStatus,
                Subtotal = admin.Subtotal,
                Total = admin.Total,
                AmountPaid = admin.AmountPaid,
                AmountPending = admin.AmountPending,
                ShipFullName = admin.ShipFullName,
                ShipPhone = admin.ShipPhone,
                ShipEmail = admin.ShipEmail,
                ShipLine1 = admin.ShipLine1,
                ShipCity = admin.ShipCity,
                ShipState = admin.ShipState,
                ShipPincode = admin.ShipPincode,
                CustomerNote = admin.CustomerNote,
                Items = admin.Items,

                Payments = o.OrderPayments
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new OrderPaymentResponseDto
                    {
                        Id = p.Id,
                        Amount = p.Amount,
                        CreatedAt = p.CreatedAt
                    })
                    .ToList(),

                History = o.OrderTransitions
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new OrderTransitionDto
                    {
                        Field = t.Field,
                        FromValue = t.FromValue,
                        ToValue = t.ToValue,
                        CreatedAt = t.CreatedAt,
                        ChangedBy = t.ChangedBy
                    }).ToList(),

                Notes = o.OrderNotes
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new OrderNoteDto
                    {
                        Id = n.Id,
                        Note = n.Note,
                        CreatedAt = n.CreatedAt,
                        CreatedBy = n.CreatedBy
                    }).ToList()
            };
        }

        public static OrderConfirmationResponseDto MapConfirmation(Order o) => new()
        {
            OrderNumber = o.OrderNumber,
            Total = o.Total,
            CustomerName = o.CustomerDetails.FullName,
            AddressLine = o.CustomerDetails.Line1,
            City = o.CustomerDetails.City,
            State = o.CustomerDetails.State,
            Pincode = o.CustomerDetails.Pincode,
            Note = o.CustomerNote,
            Items = o.OrderItems.Select(i => new OrderItemResponseDto
            {
                Name = i.ProductName,
                VariantLabel = i.VariantLabel,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        };

        public static MyOrderResponseDto MapMine(Order o) => new()
        {
            OrderNumber = o.OrderNumber,
            CreatedAt = o.CreatedAt,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus?.ToString(),
            AmountPaid = o.AmountPaid,
            AmountPending = Math.Max(0m, o.Total - o.AmountPaid),
            Total = o.Total,
            ShipCity = o.CustomerDetails.City,
            ShipState = o.CustomerDetails.State,
            ShipPincode = o.CustomerDetails.Pincode,
            ShipLine1 = o.CustomerDetails.Line1,
            Note = o.CustomerNote,
            Items = o.OrderItems.Select(i => new OrderItemResponseDto
            {
                Name = i.ProductName,
                VariantLabel = i.VariantLabel,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal,
                ImageUrl = i.ImageUrl
            }).ToList()
        };

    }
}
