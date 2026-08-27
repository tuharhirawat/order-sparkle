using MamtasImitationJewelleryBE.Enums;
using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class Order
{
    public Guid Id { get; set; }

    public string OrderNumber { get; set; } = null!;

    public Guid CustomerDetailsId { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Total { get; set; }

    public decimal AmountPaid { get; set; }

    public OrderStatus Status { get; set; }

    public PaymentStatus? PaymentStatus { get; set; }

    public string? CustomerNote { get; set; }

    public string IdempotencyKey { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual OrderCustomerDetail CustomerDetails { get; set; } = null!;

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<OrderNote> OrderNotes { get; set; } = new List<OrderNote>();

    public virtual ICollection<OrderTransition> OrderTransitions { get; set; } = new List<OrderTransition>();

    public virtual ICollection<OrderPayment> OrderPayments { get; set; } = new List<OrderPayment>();
}
