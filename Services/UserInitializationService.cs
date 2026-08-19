using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.Enums;
using MamtasImitationJewelleryBE.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MamtasImitationJewelleryBE.Services
{
    public class UserInitializationService
    {
        private readonly ApplicationDbContext _context;

        public UserInitializationService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Creates the application profile and default user role
        /// after a user has been created in Supabase Auth.
        /// Safe to call multiple times.
        /// </summary>
        public async Task<bool> InitializeNewUserAsync(
            Guid userId,
            string fullName,
            string? mobileNumber,
            string email)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingProfile = await _context.Profiles
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                var existingUserRole = await _context.UserRoles
                    .FirstOrDefaultAsync(ur =>
                        ur.UserId == userId &&
                        ur.Role == UserRoleType.User);

                var utcNow = DateTime.UtcNow;

                if (existingProfile == null)
                {
                    var profile = new Profile
                    {
                        UserId = userId,
                        FullName = fullName ?? string.Empty,
                        MobileNumber = mobileNumber,
                        Email = email,
                        CreatedAt = utcNow,
                        UpdatedAt = utcNow
                    };

                    _context.Profiles.Add(profile);
                }

                if (existingUserRole == null)
                {
                    var userRole = new UserRole
                    {
                        UserId = userId,
                        Role = UserRoleType.User,
                        CreatedAt = utcNow
                    };

                    _context.UserRoles.Add(userRole);
                }

                if (existingProfile != null && existingUserRole != null)
                {
                    await transaction.CommitAsync();
                    return true;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is PostgresException pg &&
                      pg.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                await transaction.RollbackAsync();

                // Another request may have created the records.
                // Treat the initialization as successful.
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                Console.WriteLine($"User initialization failed: {ex}");
                throw;
            }
        }
    }
}