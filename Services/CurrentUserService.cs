using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.DTOs.Auth;
using MamtasImitationJewelleryBE.Infrastructure.Clients;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MamtasImitationJewelleryBE.Enums;

namespace MamtasImitationJewelleryBE.Services
{
    /// <summary>
    /// Responsible for loading the authenticated user's information,
    /// synchronizing the local profile, and initializing user records
    /// when they do not already exist.
    /// </summary>
    public class CurrentUserService
    {
        private readonly IAuthProviderClient _supabaseAuthClient;
        private readonly ApplicationDbContext _context;
        private readonly UserInitializationService _userInitializationService;

        public CurrentUserService(
            IAuthProviderClient supabaseAuthClient,
            ApplicationDbContext context,
            UserInitializationService userInitializationService)
        {
            _supabaseAuthClient = supabaseAuthClient;
            _context = context;
            _userInitializationService = userInitializationService;
        }

        public async Task<MeResponseDto?> GetCurrentUserAsync(string accessToken)
        {
            var root = await LoadAuthenticatedUserAsync(accessToken);

            if (root == null)
                return null;

            var authenticatedUser = root.Value;
            var authEmail = authenticatedUser.GetProperty("email").GetString() ?? string.Empty;
            string fullName = string.Empty;
            string? mobileNumber = null;

            if (authenticatedUser.TryGetProperty("user_metadata", out var metadata))
            {
                if (metadata.TryGetProperty("full_name", out var fullNameElement))
                {
                    fullName = fullNameElement.GetString() ?? string.Empty;
                }

                if (metadata.TryGetProperty("mobile_number", out var mobileElement))
                {
                    mobileNumber = mobileElement.GetString();
                }
            }

            var userId = Guid.Parse(authenticatedUser.GetProperty("id").GetString()!);

            var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                var initialized = await _userInitializationService.InitializeNewUserAsync(
                    userId,
                    fullName,
                    mobileNumber,
                    authEmail
                );

                if (!initialized)
                {
                    throw new InvalidOperationException("Failed to initialize user profile.");
                }

                profile = await _context.Profiles.FirstOrDefaultAsync(p => p.UserId == userId);

                if (profile == null)
                {
                    throw new InvalidOperationException("User profile was not created.");
                }
            }

            if (!string.Equals(
                    profile.Email,
                    authEmail,
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                profile.Email = authEmail;
                profile.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new MeResponseDto
            {
                UserId = profile.UserId,
                FullName = profile.FullName,
                Email = profile.Email ?? "",
                MobileNumber = profile.MobileNumber,
                IsAdmin = await _context.UserRoles.AnyAsync(role =>
                    role.UserId == profile.UserId && role.Role == UserRoleType.Admin),
                AnyAdminExists = await _context.UserRoles.AnyAsync(role =>
                    role.Role == UserRoleType.Admin),
            };
        }

        // Private Helper Method
        private async Task<JsonElement?> LoadAuthenticatedUserAsync(string accessToken)
        {
            var response = await _supabaseAuthClient.GetAuthenticatedUserAsync(accessToken);

            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();

            using var document = JsonDocument.Parse(json);

            return document.RootElement.Clone();
        }
    }
}
