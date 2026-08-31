using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.Exceptions;
using MamtasImitationJewelleryBE.Models;
using Microsoft.EntityFrameworkCore;

namespace MamtasImitationJewelleryBE.Services
{
    public class InventoryManagementService
    {
        private readonly ApplicationDbContext _context;

        public InventoryManagementService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Deducts ordered quantities from product stock using atomic,
        /// conditional UPDATE statements so concurrent payment confirmations
        /// can never push stock below zero. Throws OrderValidationException
        /// if any product is short — the caller is expected to run this
        /// inside a transaction and roll back on failure.
        /// </summary>
        public async Task DeductInventoryForOrderAsync(Order order)
        {
            var lines = order.OrderItems.Where(i => i.Quantity > 0).ToList();
            if (lines.Count == 0)
                return;

            var productIds = lines.Select(i => i.ProductId).Distinct().ToList();

            var productInfo = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name, p.TrackStock })
                .ToDictionaryAsync(p => p.Id, p => p);

            var deductions = lines
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            foreach (var (productId, quantity) in deductions)
            {
                if (!productInfo.TryGetValue(productId, out var info))
                    throw new OrderValidationException("One of the ordered products no longer exists.");

                if (!info.TrackStock)
                    continue;

                var affected = await _context.Products
                    .Where(p => p.Id == productId && p.Stock >= quantity)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(p => p.Stock, p => p.Stock - quantity)
                        .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));

                if (affected == 0)
                {
                    throw new OrderValidationException(
                        $"Insufficient stock for {info.Name}. Please adjust the order quantities and try again.");
                }
            }
        }

        /// <summary>
        /// Reverses a previous DeductInventoryForOrderAsync call — used on
        /// refund. Always succeeds (adding stock back can't go negative), so
        /// no conditional WHERE is needed, but it's still done via
        /// ExecuteUpdateAsync so it's an atomic, single round-trip statement.
        /// </summary>
        public async Task RestockForOrderAsync(Order order)
        {
            var lines = order.OrderItems.Where(i => i.Quantity > 0).ToList();
            if (lines.Count == 0)
                return;

            var productIds = lines.Select(i => i.ProductId).Distinct().ToList();

            var trackedProductIds = await _context.Products
                .Where(p => productIds.Contains(p.Id) && p.TrackStock)
                .Select(p => p.Id)
                .ToListAsync();

            var restocks = lines
                .Where(i => trackedProductIds.Contains(i.ProductId))
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            foreach (var (productId, quantity) in restocks)
            {
                await _context.Products
                    .Where(p => p.Id == productId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(p => p.Stock, p => p.Stock + quantity)
                        .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
            }
        }
    }
}