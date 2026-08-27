using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class OrderCustomerDetail
{
    public Guid Id { get; set; }

    public Guid? ProfileId { get; set; }
    
    public virtual Profile? Profile { get; set; }

    public string FullName { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string? Email { get; set; }

    public string Line1 { get; set; } = null!;

    public string City { get; set; } = null!;

    public string State { get; set; } = null!;

    public string Pincode { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
