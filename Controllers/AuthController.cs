using MamtasImitationJewelleryBE.DTOs;
using MamtasImitationJewelleryBE.DTOs.Auth;
using MamtasImitationJewelleryBE.Services;
using Microsoft.AspNetCore.Mvc;

namespace MamtasImitationJewelleryBE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly CookieService _cookieService;
        private readonly CurrentUserService _currentUserService;
        private readonly AdminAccessService _adminAccessService;

        public AuthController(
            AuthService authService,
            CookieService cookieService,
            CurrentUserService currentUserService,
            AdminAccessService adminAccessService)
        {
            _authService = authService;
            _cookieService = cookieService;
            _currentUserService = currentUserService;
            _adminAccessService = adminAccessService;
        }

        [HttpPost("Signup")]
        public async Task<IActionResult> Signup(SignupRequestDto request)
        {
            var result = await _authService.SignupAsync(request);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login(LoginRequestDto request)
        {
            var result = await _authService.LoginAsync(request);

            if (!result.Success)
                return BadRequest(result);

            _cookieService.SetAuthCookies(
                Response,
                result.AccessToken,
                result.RefreshToken,
                result.ExpiresIn
            );

            return Ok(new
            {
                result.Success,
                result.Message
            });
        }

        [HttpGet("Me")]
        public async Task<IActionResult> Me()
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            try
            {
                var user = await _currentUserService.GetCurrentUserAsync(accessToken);

                if (user == null)
                    return Unauthorized();

                return Ok(user);
            }
            catch (Exception)
            {
                return StatusCode(500, new ApiResponseDto
                {
                    Success = false,
                    Message = "Unable to initialize your account. Please try again."
                });
            }
        }

        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            _cookieService.ClearAuthCookies(Response);

            return Ok(new
            {
                Success = true,
                Message = "Logged out successfully"
            });
        }

        [HttpPost("ClaimFirstOwner")]
        public async Task<IActionResult> ClaimFirstOwner()
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var user = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (user == null)
                return Unauthorized();

            var result = await _adminAccessService.ClaimFirstOwnerAsync(user.UserId);
            return Ok(new { granted = result.Granted, reason = result.Reason });
        }
    }
}
