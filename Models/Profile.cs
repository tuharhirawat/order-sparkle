using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class Profile
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string FullName { get; set; } = null!;

    public string? MobileNumber { get; set; }

    public string? Email { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    public virtual ICollection<OrderCustomerDetail> OrderCustomerDetails { get; set; } = new List<OrderCustomerDetail>();
}
