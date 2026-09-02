using System.Data;
using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.Enums;
using MamtasImitationJewelleryBE.Models;
using Microsoft.EntityFrameworkCore;

namespace MamtasImitationJewelleryBE.Services
{
    public class AdminAccessService
    {
        private readonly ApplicationDbContext _context;

        public AdminAccessService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// The first person to reach the studio with no existing Admin/Owner
        /// is promoted to Owner, not Admin. Everyone after that is blocked
        /// until an Owner grants them access (handled separately later).
        /// </summary>
        public async Task<(bool Granted, string? Reason)> ClaimFirstOwnerAsync(Guid userId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var privilegedRoleExists = await _context.UserRoles
                .AnyAsync(role => role.Role == UserRoleType.Admin || role.Role == UserRoleType.Owner);

            if (privilegedRoleExists)
            {
                await transaction.CommitAsync();
                return (false, "An owner or administrator already exists for this store.");
            }

            var existingRole = await _context.UserRoles.FirstOrDefaultAsync(r => r.UserId == userId);

            if (existingRole != null)
            {
                existingRole.Role = UserRoleType.Owner;
            }
            else
            {
                _context.UserRoles.Add(new UserRole
                {
                    UserId = userId,
                    Role = UserRoleType.Owner,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null);
        }
    }
}
