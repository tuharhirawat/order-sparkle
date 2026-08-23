using MamtasImitationJewelleryBE.DTOs.Product;
using MamtasImitationJewelleryBE.Services;
using Microsoft.AspNetCore.Mvc;

namespace MamtasImitationJewelleryBE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly ProductService _productService;
        private readonly CurrentUserService _currentUser;

        public ProductController(ProductService productService, CurrentUserService currentUser)
        {
            _productService = productService;
            _currentUser = currentUser;
        }

        // Users use this endpoints to get the details

        [HttpGet("Categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _productService.GetCategoriesAsync();

            return Ok(categories);
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts(
            [FromQuery] string? categoryUrlName = null,
            [FromQuery] string? search = null,
            [FromQuery] string? sort = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] bool featuredOnly = false,
            [FromQuery] bool inStockOnly = false,
            [FromQuery] int? limit = null)
        {
            var products = await _productService.GetProductsAsync(
                categoryUrlName,
                search,
                sort,
                minPrice,
                maxPrice,
                featuredOnly,
                inStockOnly,
                limit);

            return Ok(products);
        }

        [HttpGet("Details/{urlName}")]
        public async Task<IActionResult> GetProductDeatils(string urlName)
        {
            var product = await _productService.GetProductDetailsByUrlNameAsync(urlName);

            if (product == null)
                return NotFound();

            return Ok(product);
        }

        // Admin only endpoints

        [HttpGet("Categories/Admin")]
        public async Task<IActionResult> GetAdminCategories()
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            var categories = await _productService.GetAdminCategoriesAsync();

            return Ok(categories);
        }

        [HttpPost("Categories")]
        public async Task<IActionResult> CreateCategory([FromForm] CreateCategoryRequestDto request)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var category = await _productService.CreateCategoryAsync(request, baseUrl);

                return Ok(category);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPatch("Categories/{id}/Status")]
        public async Task<IActionResult> UpdateCategoryStatus(
            Guid id,
            [FromQuery] bool isActive)
        {
            if (!await IsAdmin()) return Forbid();

            var updated = await _productService.UpdateCategoryStatusAsync(id, isActive);

            if (!updated)
                return NotFound(new
                {
                    Success = false,
                    Message = "Category not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Category status updated."
            });
        }

        [HttpDelete("Categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            var deleted = await _productService.DeleteCategoryAsync(id);

            if (!deleted)
                return NotFound(new
                {
                    Success = false,
                    Message = "Category not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Category deleted successfully."
            });
        }

        [HttpPost]
        [RequestSizeLimit(60 * 1024 * 1024)]
        public async Task<IActionResult> CreateProduct([FromForm] CreateProductRequestDto request)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var product = await _productService.CreateProductAsync(
                    request,
                    baseUrl);

                return Ok(product);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("Admin")]
        public async Task<IActionResult> GetAdminProducts()
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            var products = await _productService.GetAdminProductsAsync();

            return Ok(products);
        }

        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> UpdateProduct(
            Guid id,
            [FromForm] UpdateProductRequestDto request)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var product = await _productService.UpdateProductAsync(id, request, baseUrl);

                if (product == null)
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = "Product not found."
                    });
                }

                return Ok(product);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            var deleted = await _productService.DeleteProductAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Product not found."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Product deleted successfully."
            });
        }

        [HttpGet("Categories/Name")]
        public async Task<IActionResult> GetAllCategoryNames()
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            var options = await _productService.GetAllCategoryNamesAsync();
            return Ok(options);
        }

        private async Task<bool> IsAdmin()
        {
            var token = Request.Cookies["access_token"];
            if (string.IsNullOrWhiteSpace(token)) return false;
            var user = await _currentUser.GetCurrentUserAsync(token);
            return user?.IsAdmin == true;
        }
    }
}