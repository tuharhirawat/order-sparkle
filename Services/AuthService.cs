using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.Infrastructure.Clients;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using MamtasImitationJewelleryBE.DTOs.Auth;

namespace MamtasImitationJewelleryBE.Services
{
    /// <summary>
    /// Handles authentication workflows including signup,
    /// login and validation while delegating all Supabase
    /// communication to the authentication client.
    /// </summary>
    public class AuthService
    {
        private readonly IAuthProviderClient _supabaseAuthClient;
        private readonly ApplicationDbContext _context;
        private readonly CurrentUserService _currentUserService;

        public AuthService(
            IAuthProviderClient supabaseAuthClient,
            ApplicationDbContext context,
            CurrentUserService currentUserService)
        {
            _supabaseAuthClient = supabaseAuthClient;
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SignupResponseDto> SignupAsync(SignupRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var normalizedMobile = request.MobileNumber.Trim();

            var normalizedFullName = request.FullName.Trim();

            var existingProfile = await _context.Profiles
                .FirstOrDefaultAsync(x =>
                    (x.Email ?? "").ToLower() == normalizedEmail ||
                    x.MobileNumber == normalizedMobile);

            if (existingProfile != null)
            {
                return new SignupResponseDto
                {
                    Success = false,
                    Message = "An account already exists with this email or mobile number"
                };
            }

            var signupRequest = new
            {
                email = normalizedEmail,
                password = request.Password,
                data = new
                {
                    full_name = normalizedFullName,
                    mobile_number = normalizedMobile
                }
            };

            var response = await _supabaseAuthClient.RegisterAuthUserAsync(signupRequest);

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SignupResponseDto
                {
                    Success = false,
                    Message = responseContent
                };
            }

            return new SignupResponseDto
            {
                Success = true,
                Message = "Account created successfully. Please verify your email.",
            };
        }

        public async Task<AuthenticationResponseDto> LoginAsync(LoginRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var loginRequest = new
            {
                email = normalizedEmail,
                password = request.Password
            };

            var response = await _supabaseAuthClient.AuthenticatePasswordUserAsync(loginRequest);

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                if (responseContent.Contains("Email not confirmed"))
                {
                    return new AuthenticationResponseDto
                    {
                        Success = false,
                        Message = "Please verify your email before logging in."
                    };
                }

                if (responseContent.Contains("Invalid login credentials"))
                {
                    return new AuthenticationResponseDto
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    };
                }

                return new AuthenticationResponseDto
                {
                    Success = false,
                    Message = "Unable to log in. Please try again."
                };
            }

            using var document = JsonDocument.Parse(responseContent);

            var root = document.RootElement;

            var accessToken = root.GetProperty("access_token").GetString() ?? "";

            var refreshToken = root.GetProperty("refresh_token").GetString() ?? "";

            var expiresIn = root.GetProperty("expires_in").GetInt32();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
            {
                return new AuthenticationResponseDto
                {
                    Success = false,
                    Message = "Unable to initialize your account. Please try again."
                };
            }

            return new AuthenticationResponseDto
            {
                Success = true,
                Message = "Login successful",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = expiresIn,
            };
        }
    }
}
