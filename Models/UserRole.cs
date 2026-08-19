using MamtasImitationJewelleryBE.Enums;
using System;
using System.Collections.Generic;

namespace MamtasImitationJewelleryBE.Models;

public partial class UserRole
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public UserRoleType Role { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Profile Profile { get; set; } = null!;
}
