using MamtasImitationJewelleryBE.DTOs.Product;
using MamtasImitationJewelleryBE.Models;

namespace MamtasImitationJewelleryBE.Mappers
{
    public static class ProductMapper
    {
        public static ProductResponseDto MapProduct(Product product)
        {
            return new ProductResponseDto
            {
                Id = product.Id,
                ProductCode = product.ProductCode,
                Name = product.Name,
                UrlName = product.UrlName,
                Description = product.Description,
                Price = product.Price,
                CompareAtPrice = product.CompareAtPrice,
                Material = product.Material,
                Details = product.Details,
                Stock = product.Stock,
                TrackStock = product.TrackStock,
                IsFeatured = product.IsFeatured,
                IsNew = product.CreatedAt >= DateTime.UtcNow.AddHours(-48),
                IsActive = product.IsActive,
                CreatedAt = product.CreatedAt,
                UpdatedAt = product.UpdatedAt,
                Category = MapCategoryResponse(product.Category),
                ProductImages = product.ProductImages
                    .OrderBy(x => x.Position)
                    .Select(x => new ProductImageResponseDto
                    {
                        Id = x.Id,
                        Url = x.Url,
                        Position = x.Position
                    })
                    .ToList(),
                ProductVariants = product.ProductVariants
                    .OrderBy(x => x.Position)
                    .Select(x => new ProductVariantResponseDto
                    {
                        Id = x.Id,
                        Label = x.Label,
                        VariantCode = x.VariantCode,
                        PriceDelta = x.PriceDelta,
                        Stock = x.Stock,
                        IsActive = x.IsActive,
                        Position = x.Position
                    })
                    .ToList()
            };
        }

        public static ProductSummaryResponseDto MapProductSummary(Product product)
        {
            return new ProductSummaryResponseDto
            {
                Id = product.Id,
                Name = product.Name,
                UrlName = product.UrlName,
                Price = product.Price,
                CompareAtPrice = product.CompareAtPrice,
                IsFeatured = product.IsFeatured,
                IsNew = product.CreatedAt >= DateTime.UtcNow.AddHours(-48),
                InStock = !product.TrackStock || product.Stock > 0,
                ThumbnailUrl = product.ProductImages
                    .OrderBy(x => x.Position)
                    .Select(x => x.Url)
                    .FirstOrDefault() ?? product.Category?.ImageUrl,
                Category = MapCategoryResponse(product.Category)
            };
        }

        public static CategoryResponseDto? MapCategoryResponse(Category? category)
        {
            if (category == null) return null;

            return new CategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                UrlName = category.UrlName,
                ImageUrl = category.ImageUrl,
                Initials = category.Prefix
            };
        }
    }
}