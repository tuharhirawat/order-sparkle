using MamtasImitationJewelleryBE.DTOs.Order;
using MamtasImitationJewelleryBE.Services;
using MamtasImitationJewelleryBE.Exceptions;
using Microsoft.AspNetCore.Mvc;
namespace MamtasImitationJewelleryBE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrderController : ControllerBase
    {
        private readonly OrderService _orderService;
        private readonly CurrentUserService _currentUser;

        public OrderController(
            OrderService orderService,
            CurrentUserService currentUser)
        {
            _orderService = orderService;
            _currentUser = currentUser;
        }

        // Endpoint used by Customer

        [HttpGet("MyRequests")]
        public async Task<IActionResult> MyOrderRequests()
        {
            var token = Request.Cookies["access_token"];
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized();

            var user = await _currentUser.GetCurrentUserAsync(token);
            if (user == null)
                return Unauthorized();

            try
            {
                var orders = await _orderService.GetMyOrdersAsync(user.UserId);
                return Ok(orders);
            }
            catch (ProfileNotFoundException)
            {
                return Unauthorized();
            }
        }

        [HttpPost("Create")]
        public async Task<IActionResult> CreateOrder(
            [FromBody] CreateOrderRequestDto request)
        {
            var token = Request.Cookies["access_token"];
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized();

            var user = await _currentUser.GetCurrentUserAsync(token);
            if (user == null)
                return Unauthorized();

            try
            {
                var confirmation = await _orderService.CreateOrderAsync(user.UserId, request);
                return Ok(confirmation);
            }
            catch (ProfileNotFoundException)
            {
                return Unauthorized();
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (TooManyOrderRequestsException ex)
            {
                return StatusCode(
                    StatusCodes.Status429TooManyRequests,
                    new
                    {
                        Success = false,
                        Message = ex.Message
                    });
            }
        }

        // Endpoints used by Admin

        [HttpPost("{id:guid}/items/adjust")]
        public async Task<IActionResult> AdjustOrderItems(Guid id, [FromBody] AdjustOrderItemsRequestDto request)
        {
            if (!await IsAdmin())
                return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });

            try
            {
                var order = await _orderService.AdjustOrderItemsAsync(id, request.Items, await CurrentAdminIdentity());
                return Ok(order);
            }
            catch (OrderNotFoundException ex) 
            { 
                return NotFound(new 
                { 
                    Success = false, 
                    Message = ex.Message 
                }); 
            }
            catch (OrderValidationException ex) 
            { 
                return BadRequest(new 
                { 
                    Success = false, 
                    Message = ex.Message 
                }); 
            }
        }

        [HttpGet("Admin/Summary")]
        public async Task<IActionResult> GetOrdersSummaryForAdmin()
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            var orders = await _orderService.GetAdminOrdersSummaryAsync();
            return Ok(orders);
        }

        [HttpGet("Admin/{category}")]
        public async Task<IActionResult> GetStatusBasedOrdersForAdmin(string category)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new { Success = false, Message = "Admin access required." });
            }

            try
            {
                var orders = await _orderService.GetStatusBasedOrdersForAdmin(category);
                return Ok(orders);
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetOrderDetails(Guid id)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            try
            {
                var order = await _orderService.GetOrderDetailsAsync(id);
                return Ok(order);
            }
            catch (OrderNotFoundException ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("Admin/Counts")]
        public async Task<IActionResult> GetOrderStatusCountsForAdmin()
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new { Success = false, Message = "Admin access required." });
            }

            var counts = await _orderService.GetAdminOrderStatusCountsAsync();
            return Ok(counts);
        }

        [HttpPost("{id:guid}/acknowledge")]
        public async Task<IActionResult> AcknowledgeOrder(Guid id)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            try
            {
                var order = await _orderService.AcknowledgeOrderAsync(
                    id, await CurrentAdminIdentity()
                );
                return Ok(order);
            }
            catch (OrderNotFoundException ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("{id:guid}/mark-paid")]
        public async Task<IActionResult> MarkAsPaid(Guid id)
        {
            if (!await IsAdmin()) return StatusCode(StatusCodes.Status403Forbidden, new { Success = false, Message = "Admin access required." });
            try
            {
                var order = await _orderService.MarkOrderAsPaidAsync(id, await CurrentAdminIdentity());
                return Ok(order);
            }
            catch (OrderNotFoundException ex) 
            { 
                return NotFound(new 
                { 
                    Success = false, 
                    Message = ex.Message
                }); 
            }
            catch (OrderValidationException ex) 
            { 
                return BadRequest(new 
                { 
                    Success = false, 
                    Message = ex.Message 
                }); 
            }
        }

        [HttpPost("{id:guid}/cancel")]
        public async Task<IActionResult> CancelOrder(Guid id)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            try
            {
                var order = await _orderService.CancelOrderAsync(
                    id, await CurrentAdminIdentity()
                );

                return Ok(order);
            }
            catch (OrderNotFoundException ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("{id:guid}/refund")]
        public async Task<IActionResult> RefundOrder(Guid id)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            try
            {
                var order = await _orderService.RefundOrderAsync(
                    id, await CurrentAdminIdentity()
                );

                return Ok(order);
            }
            catch (OrderNotFoundException ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("{id:guid}/notes")]
        public async Task<IActionResult> AddNote(
            Guid id,
            [FromBody] AddOrderNoteRequestDto request)
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            try
            {
                var order = await _orderService.AddOrderNoteAsync(
                    id, request.Note, await CurrentAdminIdentity()
                );

                return Ok(order);
            }
            catch (OrderNotFoundException ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (OrderValidationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("Customers")]
        public async Task<IActionResult> GetAdminCustomers()
        {
            if (!await IsAdmin())
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
                    {
                        Success = false,
                        Message = "Admin access required."
                    });
            }

            var customers = await _orderService.GetAdminCustomersAsync();
            return Ok(customers);
        }

        /// <summary>
        /// Currently not in use. Returns all orders
        /// </summary>

        //[HttpGet]
        //public async Task<IActionResult> GetAdminOrders()
        //{
        //    if (!await IsAdmin())
        //    {
        //        return StatusCode(
        //            StatusCodes.Status403Forbidden,
        //            new
        //            {
        //                Success = false,
        //                Message = "Admin access required."
        //            });
        //    }

        //    var orders = await _orderService.GetAdminOrdersAsync();
        //    return Ok(orders);
        //}

        private async Task<bool> IsAdmin()
        {
            var token = Request.Cookies["access_token"];

            if (string.IsNullOrWhiteSpace(token))
                return false;

            var user = await _currentUser.GetCurrentUserAsync(token);
            return user?.IsAdmin == true;
        }

        private async Task<string?> CurrentAdminIdentity()
        {
            var token = Request.Cookies["access_token"];

            if (string.IsNullOrWhiteSpace(token))
                return null;

            var user = await _currentUser.GetCurrentUserAsync(token);
            return user?.Email;
        }
    }
}