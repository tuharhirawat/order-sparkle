using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.DTOs.Order;
using MamtasImitationJewelleryBE.Enums;
using MamtasImitationJewelleryBE.Models;
using Microsoft.EntityFrameworkCore;
using MamtasImitationJewelleryBE.Mappers;
using MamtasImitationJewelleryBE.Exceptions;

namespace MamtasImitationJewelleryBE.Services
{
    public class OrderService
    {
        private readonly ApplicationDbContext _context;

        public OrderService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Customer used
        public async Task<List<MyOrderResponseDto>> GetMyOrdersAsync(Guid authUserId)
        {
            var profileId = await ResolveProfileIdAsync(authUserId);

            var orders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.CustomerDetails)
                .Include(o => o.OrderItems)
                .Where(o => o.CustomerDetails.ProfileId == profileId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(OrderMapper.MapMine).ToList();
        }

        public async Task<OrderConfirmationResponseDto> CreateOrderAsync(Guid authUserId, CreateOrderRequestDto request)
        {
            var profileId = await ResolveProfileIdAsync(authUserId);

            if (request.Items is null || request.Items.Count == 0)
                throw new OrderValidationException("Your bag is empty.");

            var existing = await _context.Orders
                .Include(o => o.CustomerDetails)
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.IdempotencyKey == request.IdempotencyKey);

            if (existing != null)
                return OrderMapper.MapConfirmation(existing);

            var tenMinAgo = DateTime.UtcNow.AddMinutes(-10);
            var recentCount = await _context.Orders
                .Include(o => o.CustomerDetails)
                .CountAsync(o => o.CustomerDetails.Phone == request.Customer.Phone && o.CreatedAt >= tenMinAgo);

            if (recentCount >= 5)
                throw new TooManyOrderRequestsException("Too many order requests. Please try again in a few minutes.");

            var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Include(p => p.ProductVariants)
                .Include(p => p.ProductImages)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            var lines = new List<OrderItem>();

            foreach (var item in request.Items)
            {
                var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                if (product is null || !product.IsActive)
                    throw new OrderValidationException("One of the items is no longer available. Please review your bag.");

                var variants = product.ProductVariants;
                var variant = item.VariantId.HasValue
                    ? variants.FirstOrDefault(v => v.Id == item.VariantId.Value)
                    : null;

                var hasActiveVariants = variants.Any(v => v.IsActive);
                var variantRequiredButMissing = hasActiveVariants && variant is null;
                var variantGivenButInvalid = item.VariantId.HasValue && (variant is null || !variant.IsActive);

                if (variantRequiredButMissing || variantGivenButInvalid)
                    throw new OrderValidationException($"Please choose an available option for {product.Name}.");

                var stock = variant?.Stock ?? product.Stock;
                if (product.TrackStock && stock < item.Quantity)
                    throw new OrderValidationException($"Only {stock} left of {product.Name}.");

                var unitPrice = product.Price + (variant?.PriceDelta ?? 0);
                var image = product.ProductImages.OrderBy(i => i.Position).FirstOrDefault();
                var lineTotal = Math.Round(unitPrice * item.Quantity, 2);

                lines.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    VariantId = variant?.Id,
                    ProductName = product.Name,
                    ProductSku = product.ProductCode,
                    VariantLabel = variant?.Label,
                    UnitPrice = unitPrice,
                    Quantity = item.Quantity,
                    LineTotal = lineTotal,
                    ImageUrl = image?.Url
                });
            }

            var customerDetails = new OrderCustomerDetail
            {
                Id = Guid.NewGuid(),
                ProfileId = profileId,
                FullName = request.Customer.FullName.Trim(),
                Phone = request.Customer.Phone.Trim(),
                Email = string.IsNullOrWhiteSpace(request.Customer.Email) ? null : request.Customer.Email.Trim(),
                Line1 = request.Customer.Line1.Trim(),
                City = request.Customer.City.Trim(),
                State = request.Customer.State.Trim(),
                Pincode = request.Customer.Pincode.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            var total = lines.Sum(l => l.LineTotal);

            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = await GenerateOrderNumberAsync(),
                CustomerDetails = customerDetails,
                Subtotal = total,
                Total = total,
                Status = OrderStatus.PendingAcknowledgement,
                PaymentStatus = null,
                AmountPaid = 0m,
                CustomerNote = string.IsNullOrWhiteSpace(request.Customer.Note) ? null : request.Customer.Note.Trim(),
                IdempotencyKey = request.IdempotencyKey,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OrderItems = lines
            };

            _context.Orders.Add(order);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("idempotency_key") == true)
            {
                var winner = await _context.Orders
                    .Include(o => o.CustomerDetails)
                    .Include(o => o.OrderItems)
                    .FirstAsync(o => o.IdempotencyKey == request.IdempotencyKey);
                return OrderMapper.MapConfirmation(winner);
            }

            return OrderMapper.MapConfirmation(order);
        }

        // Admin Used

        public async Task<OrderDetailsResponseDto> GetOrderDetailsAsync(Guid orderId)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);
            return OrderMapper.MapDetails(order);
        }

        public async Task<OrderDetailsResponseDto> AcknowledgeOrderAsync(
            Guid orderId,
            string? changedBy)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);

            if (order.Status != OrderStatus.PendingAcknowledgement)
            {
                throw new OrderValidationException(
                    "Only orders pending acknowledgement can be acknowledged.");
            }

            var now = DateTime.UtcNow;

            AddTransition(
                order,
                "Status",
                order.Status.ToString(),
                OrderStatus.OrderAcknowledged.ToString(),
                changedBy,
                now);

            order.Status = OrderStatus.OrderAcknowledged;

            AddTransition(
                order,
                "PaymentStatus",
                order.PaymentStatus?.ToString() ?? "None",
                PaymentStatus.Pending.ToString(),
                changedBy,
                now);

            order.PaymentStatus = PaymentStatus.Pending;

            order.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return OrderMapper.MapDetails(order);
        }

        public async Task<OrderDetailsResponseDto> MarkOrderAsPaidAsync(Guid orderId, string? changedBy)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);

            if (order.Status != OrderStatus.OrderAcknowledged)
                throw new OrderValidationException("Only acknowledged orders can be marked as paid.");

            var now = DateTime.UtcNow;
            var pending = order.Total - order.AmountPaid;

            _context.OrderPayments.Add(new OrderPayment
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Amount = pending,
                CreatedAt = now
            });

            order.AmountPaid = order.Total;

            AddTransition(
                order, 
                "PaymentStatus", 
                order.PaymentStatus?.ToString() ?? "None", 
                PaymentStatus.Paid.ToString(),
                changedBy,
                now);

            order.PaymentStatus = PaymentStatus.Paid;

            AddTransition(
                order,
                "Status", 
                order.Status.ToString(), 
                OrderStatus.OrderConfirmed.ToString(), 
                changedBy, 
                now);
            order.Status = OrderStatus.OrderConfirmed;

            order.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return OrderMapper.MapDetails(order);
        }

        public async Task<OrderDetailsResponseDto> CancelOrderAsync(
            Guid orderId,
            string? changedBy)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);

            if (order.Status == OrderStatus.OrderConfirmed)
            {
                throw new OrderValidationException(
                    "A confirmed order cannot be cancelled.");
            }

            if (order.Status == OrderStatus.Refunded)
            {
                throw new OrderValidationException(
                    "A refunded order cannot be cancelled.");
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                throw new OrderValidationException(
                    "The order is already cancelled.");
            }

            var now = DateTime.UtcNow;

            AddTransition(
                order,
                "Status",
                order.Status.ToString(),
                OrderStatus.Cancelled.ToString(),
                changedBy,
                now);

            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return OrderMapper.MapDetails(order);
        }

        public async Task<OrderDetailsResponseDto> RefundOrderAsync(
            Guid orderId,
            string? changedBy)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);

            if (order.AmountPaid <= 0)
            {
                throw new OrderValidationException(
                    "There is no paid amount to refund.");
            }

            if (order.PaymentStatus == PaymentStatus.Refunded ||
                order.Status == OrderStatus.Refunded)
            {
                throw new OrderValidationException(
                    "This order has already been refunded.");
            }

            if (order.Status == OrderStatus.PendingAcknowledgement)
            {
                throw new OrderValidationException(
                    "An order with no payment cannot be refunded.");
            }

            var now = DateTime.UtcNow;

            AddTransition(
                order,
                "PaymentStatus",
                order.PaymentStatus?.ToString() ?? "None",
                PaymentStatus.Refunded.ToString(),
                changedBy,
                now);

            order.PaymentStatus = PaymentStatus.Refunded;

            AddTransition(
                order,
                "Status",
                order.Status.ToString(),
                OrderStatus.Refunded.ToString(),
                changedBy,
                now);

            order.Status = OrderStatus.Refunded;

            order.UpdatedAt = now;

            await _context.SaveChangesAsync();

            return OrderMapper.MapDetails(order);
        }

        public async Task<OrderDetailsResponseDto> AddOrderNoteAsync(Guid orderId, string note, string? createdBy)
        {
            if (string.IsNullOrWhiteSpace(note))
                throw new OrderValidationException("Note cannot be empty.");

            var order = await LoadOrderWithHistoryAsync(orderId);

            _context.OrderNotes.Add(new OrderNote
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Note = note.Trim(),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            });
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return OrderMapper.MapDetails(order);
        }

        public async Task<List<AdminOrderSummaryResponseDto>> GetStatusBasedOrdersForAdmin(string category)
        {
            if (!Enum.TryParse<OrderStatus>(category, out var status))
                throw new OrderValidationException($"Unknown order category: {category}");

            var orders = await _context.Orders
                .AsNoTracking()
                .Where(o => o.Status == status)
                .Include(o => o.CustomerDetails)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(OrderMapper.MapAdminOrderSummary).ToList();
        }

        public async Task<List<AdminOrderSummaryResponseDto>> GetAdminOrdersSummaryAsync()
        {
            var orders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.CustomerDetails)
                .Where(o =>
                    o.Status != OrderStatus.Cancelled &&
                    o.Status != OrderStatus.Refunded
                )
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(OrderMapper.MapAdminOrderSummary).ToList();
        }

        public async Task<Dictionary<string, int>> GetAdminOrderStatusCountsAsync()
        {
            var counts = await _context.Orders
                .AsNoTracking()
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            return counts.ToDictionary(c => c.Status.ToString(), c => c.Count);
        }

        public async Task<List<AdminCustomerResponseDto>> GetAdminCustomersAsync()
        {
            var details = await _context.OrderCustomerDetails
                .AsNoTracking()
                .Include(d => d.Orders)
                .Where(d => d.ProfileId != null)
                .ToListAsync();

            return details
                .GroupBy(d => d.ProfileId!.Value)
                .Select(g =>
                {
                    var latest = g.OrderByDescending(d => d.CreatedAt).First();
                    var allOrders = g.SelectMany(d => d.Orders).ToList();
                    return new AdminCustomerResponseDto
                    {
                        ProfileId = g.Key,
                        FullName = latest.FullName,
                        Phone = latest.Phone,
                        Email = latest.Email,
                        FirstSeen = g.Min(d => d.CreatedAt),
                        OrdersCount = allOrders.Count,
                        TotalValue = allOrders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.Total)
                    };
                })
                .OrderByDescending(c => c.FirstSeen)
                .ToList();
        }

        public async Task<OrderDetailsResponseDto> AdjustOrderItemsAsync(
            Guid orderId, List<OrderItemQuantityDto> items, string? changedBy)
        {
            var order = await LoadOrderWithHistoryAsync(orderId);

            if (order.Status != OrderStatus.PendingAcknowledgement)
                throw new OrderValidationException("Quantities can only be adjusted before the order is acknowledged.");

            if (items is null || items.Count == 0)
                throw new OrderValidationException("No items to update.");

            var now = DateTime.UtcNow;
            var changed = false;

            foreach (var update in items)
            {
                var line = order.OrderItems.FirstOrDefault(i => i.Id == update.OrderItemId);
                if (line is null)
                    throw new OrderValidationException("One of the items does not belong to this order.");

                if (update.Quantity < 0)
                    throw new OrderValidationException($"Quantity for {line.ProductName} cannot be negative.");

                var ceiling = line.OriginalQuantity ?? line.Quantity;
                if (update.Quantity > ceiling)
                    throw new OrderValidationException($"Quantity for {line.ProductName} cannot exceed {ceiling}.");

                if (update.Quantity == line.Quantity)
                    continue;

                line.OriginalQuantity ??= line.Quantity;
                var previousQty = line.Quantity;
                line.Quantity = update.Quantity;
                line.LineTotal = Math.Round(line.UnitPrice * update.Quantity, 2);
                changed = true;

                AddTransition(order, "ItemQuantity",
                    $"{line.ProductName}: {previousQty}",
                    $"{line.ProductName}: {update.Quantity}",
                    changedBy, now);
            }

            if (!changed)
                return OrderMapper.MapDetails(order);

            order.Subtotal = order.OrderItems.Sum(i => i.LineTotal);
            order.Total = order.Subtotal;
            order.UpdatedAt = now;

            await _context.SaveChangesAsync();
            return OrderMapper.MapDetails(order);
        }

        /// <summary>
        /// Currently not in use
        /// </summary>

        //public async Task<List<AdminOrderResponseDto>> GetAdminOrdersAsync()
        //{
        //    var orders = await _context.Orders
        //        .AsNoTracking()
        //        .Include(o => o.CustomerDetails)
        //        .Include(o => o.OrderItems)
        //        .OrderByDescending(o => o.CreatedAt)
        //        .ToListAsync();

        //    return orders.Select(OrderMapper.MapAdmin).ToList();
        //}

        private async Task<Order> LoadOrderWithHistoryAsync(Guid orderId)
        {
            var order = await _context.Orders
                .Include(o => o.CustomerDetails)
                .Include(o => o.OrderItems)
                .Include(o => o.OrderTransitions)
                .Include(o => o.OrderNotes)
                .Include(o => o.OrderPayments)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            return order ?? throw new OrderNotFoundException("Order not found.");
        }

        private void AddTransition(
            Order order,
            string field,
            string fromValue,
            string toValue,
            string? changedBy,
            DateTime createdAt)
        {
            _context.OrderTransitions.Add(new OrderTransition
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Field = field,
                FromValue = fromValue,
                ToValue = toValue,
                CreatedAt = createdAt,
                ChangedBy = changedBy
            });
        }

        private async Task<string> GenerateOrderNumberAsync()
        {
            var next = await _context.Database
                .SqlQuery<long>($"select nextval('order_number_seq') as \"Value\"")
                .FirstAsync();
            return $"ORD-{next}";
        }

        private async Task<Guid> ResolveProfileIdAsync(Guid authUserId)
        {
            var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.UserId == authUserId);
            if (profile is null)
                throw new ProfileNotFoundException("No profile found for the signed-in user.");
            return profile.Id;
        }
    }
}