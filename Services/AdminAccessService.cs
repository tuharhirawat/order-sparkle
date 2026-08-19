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

        public async Task<(bool Granted, string? Reason)> ClaimFirstAdminAsync(Guid userId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var anyAdminExists = await _context.UserRoles
                .AnyAsync(role => role.Role == UserRoleType.Admin);

            if (anyAdminExists)
            {
                await transaction.CommitAsync();
                return (false, "An administrator already exists for this store.");
            }

            _context.UserRoles.Add(new UserRole
            {
                UserId = userId,
                Role = UserRoleType.Admin,
                CreatedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null);
        }
    }
}
