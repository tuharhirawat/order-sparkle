using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.DTOs.Product;
using MamtasImitationJewelleryBE.Infrastructure.Clients;
using MamtasImitationJewelleryBE.Models;
using Microsoft.EntityFrameworkCore;
using MamtasImitationJewelleryBE.Mappers;

namespace MamtasImitationJewelleryBE.Services
{
    public class ProductService
    {
        private readonly ApplicationDbContext _context;
        private readonly IStorageClient _supabaseStorage;

        public ProductService(ApplicationDbContext context, IStorageClient supabaseStorage)
        {
            _context = context;
            _supabaseStorage = supabaseStorage;
        }

        //Customer only methods which are only used for viewing the available data

        public async Task<List<CategoryDto>> GetCategoriesAsync()
            => await GetCategoriesInternalAsync(includeInactive: false);

        public async Task<List<ProductSummaryResponseDto>> GetProductsAsync(
            string? categoryUrlName = null,
            string? search = null,
            string? sort = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            bool featuredOnly = false,
            bool inStockOnly = false,
            int? limit = null)
        {
            var query = BuildProductQuery(includeInactive: false, includeVariants: false);

            if (!string.IsNullOrWhiteSpace(categoryUrlName))
            {
                query = query.Where(x =>
                    x.Category != null &&
                    x.Category.UrlName == categoryUrlName);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim();

                query = query.Where(x =>
                    EF.Functions.ILike(x.Name, $"%{searchTerm}%") ||
                    (x.Description != null &&
                     EF.Functions.ILike(x.Description, $"%{searchTerm}%")) ||
                    EF.Functions.ILike(x.ProductCode, $"%{searchTerm}%") ||
                    (x.Material != null &&
                     EF.Functions.ILike(x.Material, $"%{searchTerm}%")));
            }

            if (featuredOnly)
            {
                query = query.Where(x => x.IsFeatured);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(x => x.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(x => x.Price <= maxPrice.Value);
            }

            if (inStockOnly)
            {
                query = query.Where(x => !x.TrackStock || x.Stock > 0);
            }

            query = sort switch
            {
                "price-asc" => query.OrderBy(x => x.Price),
                "price-desc" => query.OrderByDescending(x => x.Price),
                "name" => query.OrderBy(x => x.Name),
                _ => query.OrderByDescending(x => x.CreatedAt)
            };

            if (limit.HasValue && limit.Value > 0)
            {
                query = query.Take(limit.Value);
            }

            var products = await query.ToListAsync();

            return products.Select(ProductMapper.MapProductSummary).ToList();
        }

        // Admin only methods

        public async Task<List<CategoryDto>> GetAdminCategoriesAsync()
            => await GetCategoriesInternalAsync(includeInactive: true);

        public async Task<Category> CreateCategoryAsync(CreateCategoryRequestDto request)
        {
            var name = request.Name.Trim();

            if (name.Length < 2)
                throw new ArgumentException("Enter a valid category name.");

            var urlName = GenerateUrlName(name);

            var urlNameExists = await _context.Categories
                .AnyAsync(x => x.UrlName == urlName);

            if (urlNameExists)
                throw new InvalidOperationException("A category with this name already exists.");

            var prefix = await GenerateUniqueCategoryPrefixAsync(name);

            var maxPosition = await _context.Categories
                .Select(x => (int?)x.Position)
                .MaxAsync() ?? 0;

            var category = new Category
            {
                Id = Guid.NewGuid(),
                Name = name,
                UrlName = urlName,
                Prefix = prefix,
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim(),
                Position = maxPosition + 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (request.Image != null)
            {
                if (!request.Image.ContentType.StartsWith("image/"))
                    throw new ArgumentException($"'{request.Image.FileName}' is not a valid image.");

                const long maxCategoryImageSize = 10 * 1024 * 1024;
                if (request.Image.Length > maxCategoryImageSize)
                    throw new ArgumentException("The category image must not exceed 10 MB.");

                var fileName = BuildFileName(request.Image);
                category.ImageUrl = await _supabaseStorage.UploadFileAsync(request.Image, $"category/{fileName}");
            }

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task<bool> UpdateCategoryStatusAsync(Guid id, bool isActive)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(x => x.Id == id);

            if (category == null)
                return false;

            category.IsActive = isActive;
            category.UpdatedAt = DateTime.UtcNow;

            var now = DateTime.UtcNow;

            await _context.Products
                .Where(p => p.CategoryId == id && p.IsActive != isActive)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(p => p.IsActive, isActive)
                    .SetProperty(p => p.UpdatedAt, now));

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<Category?> UpdateCategoryAsync(Guid id, UpdateCategoryRequestDto request)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(x => x.Id == id);

            if (category == null)
                return null;

            if (request.Description != null)
            {
                category.Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim();
            }

            if (request.ManageImage)
            {
                if (request.Image != null)
                {
                    if (!request.Image.ContentType.StartsWith("image/"))
                        throw new ArgumentException($"'{request.Image.FileName}' is not a valid image.");

                    const long maxCategoryImageSize = 5 * 1024 * 1024;
                    if (request.Image.Length > maxCategoryImageSize)
                        throw new ArgumentException("The category image must not exceed 5 MB.");

                    if (!string.IsNullOrWhiteSpace(category.ImageUrl))
                        await _supabaseStorage.DeleteFileAsync(category.ImageUrl);

                    var fileName = BuildFileName(request.Image);
                    category.ImageUrl = await _supabaseStorage.UploadFileAsync(request.Image, $"category/{fileName}");
                }
                else if (request.RemoveImage)
                {
                    if (!string.IsNullOrWhiteSpace(category.ImageUrl))
                        await _supabaseStorage.DeleteFileAsync(category.ImageUrl);

                    category.ImageUrl = null;
                }
            }

            category.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return category;
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(x => x.Id == id);

            if (category == null)
                return false;

            _context.Categories.Remove(category);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<ProductResponseDto> CreateProductAsync(CreateProductRequestDto request)
        {
            var name = request.Name.Trim();

            if (name.Length < 2)
                throw new ArgumentException("Enter a valid product name.");

            if (request.Price <= 0)
                throw new ArgumentException("Enter a valid price.");

            if (request.CompareAtPrice.HasValue && request.CompareAtPrice.Value <= request.Price)
                throw new ArgumentException("Compare price must be greater than the product price.");

            if (request.Stock < 0)
                throw new ArgumentException("Stock cannot be negative.");

            if (!request.CategoryId.HasValue)
                throw new ArgumentException("Please select a category.");

            var category = await _context.Categories
                .FirstOrDefaultAsync(x => x.Id == request.CategoryId.Value);

            if (category == null)
                throw new ArgumentException("Selected category was not found.");

            // Images are optional. Normalize to an empty list so the checks
            // below never fail on a null collection.
            var images = request.Images ?? new List<IFormFile>();

            if (images.Count > 3)
                throw new ArgumentException("A maximum of 3 images are allowed.");

            ValidateProductImages(images, maxTotalSize: 10 * 1024 * 1024);

            var productCode = GenerateNextProductCode(category);

            var urlName = GenerateUrlName(name);

            var urlNameExists = await _context.Products
                .AnyAsync(x => x.UrlName == urlName);

            if (urlNameExists)
            {
                throw new InvalidOperationException(
                    "A product with this name already exists.");
            }

            var now = DateTime.UtcNow;

            var product = new Product
            {
                Id = Guid.NewGuid(),
                ProductCode = productCode,
                Name = name,
                UrlName = urlName,
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim(),
                Price = request.Price,
                CompareAtPrice = request.CompareAtPrice,
                CategoryId = request.CategoryId,
                Material = string.IsNullOrWhiteSpace(request.Material)
                    ? null
                    : request.Material.Trim(),
                Details = string.IsNullOrWhiteSpace(request.Details)
                    ? null
                    : request.Details.Trim(),
                Stock = request.Stock,
                TrackStock = request.TrackStock,
                IsFeatured = request.IsFeatured,
                IsNew = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Products.Add(product);

            var imagePosition = 0;

            foreach (var image in images)
            {
                var fileName = BuildFileName(image);
                var imageUrl = await _supabaseStorage.UploadFileAsync(image, $"product/{product.Id}/{fileName}");

                _context.ProductImages.Add(new ProductImage
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Url = imageUrl,
                    Alt = name,
                    Position = imagePosition++,
                    CreatedAt = now
                });
            }

            await _context.SaveChangesAsync();

            var createdProduct = await BuildProductQuery(includeInactive: true)
                .FirstAsync(x => x.Id == product.Id);

            return ProductMapper.MapProduct(createdProduct);
        }

        public async Task<List<ProductResponseDto>> GetAdminProductsAsync()
        {
            var products = await BuildProductQuery(includeInactive: true)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return products.Select(ProductMapper.MapProduct).ToList();
        }

        public async Task<ProductResponseDto?> UpdateProductAsync(
            Guid id,
            UpdateProductRequestDto request)
        {
            var product = await _context.Products
                .Include(x => x.ProductImages)
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (product == null)
                return null;

            var restrictedFields = new List<string>();
            if (request.Name != null)
                restrictedFields.Add("name");
            if (request.Material != null)
                restrictedFields.Add("material");
            if (request.CategoryId.HasValue)
                restrictedFields.Add("categoryId");

            if (restrictedFields.Count > 0)
            {
                throw new ArgumentException(
                    $"The following product fields are not editable: {string.Join(", ", restrictedFields)}.");
            }

            if (request.Price.HasValue)
            {
                if (request.Price.Value <= 0)
                    throw new ArgumentException("Price must be greater than zero.");

                product.Price = request.Price.Value;
            }

            if (request.CompareAtPrice.HasValue)
            {
                if (request.CompareAtPrice.Value <= product.Price)
                    throw new ArgumentException("Compare price must be greater than the product price.");

                product.CompareAtPrice = request.CompareAtPrice.Value;
            }
            else if (request.Price.HasValue && product.CompareAtPrice.HasValue && product.CompareAtPrice.Value <= product.Price)
            {
                product.CompareAtPrice = null;
            }

            if (request.DiscountPercentage.HasValue)
            {
                if (request.DiscountPercentage.Value < 0 || request.DiscountPercentage.Value >= 100)
                    throw new ArgumentException("Discount must be between 0 and 100.");

                product.DiscountPercentage = request.DiscountPercentage.Value == 0
                    ? (decimal?)null
                    : request.DiscountPercentage.Value;
            }

            if (request.Stock.HasValue)
            {
                if (request.Stock.Value < 0)
                    throw new ArgumentException("Stock cannot be negative.");

                product.Stock = request.Stock.Value;
            }

            if (request.IsActive.HasValue)
            {
                if (request.IsActive.Value && product.Category != null && !product.Category.IsActive)
                {
                    throw new ArgumentException(
                        $"This product's category (\"{product.Category.Name}\") is disabled. Enable the category first, then enable this product.");
                }

                product.IsActive = request.IsActive.Value;
            }

            if (request.IsFeatured.HasValue)
                product.IsFeatured = request.IsFeatured.Value;

            if (request.Details != null)
                product.Details = string.IsNullOrWhiteSpace(request.Details) ? null : request.Details.Trim();

            if (request.ManageImages)
            {
                var images = request.Images ?? [];
                var retainedImageIds = product.ProductImages
                    .Where(image => (request.ExistingImageIds ?? []).Contains(image.Id))
                    .Select(image => image.Id)
                    .ToHashSet();

                if (retainedImageIds.Count + images.Count > 3)
                    throw new ArgumentException("A maximum of 3 images are allowed.");

                ValidateProductImages(images, maxTotalSize: 10 * 1024 * 1024);

                var removedImages = product.ProductImages
                    .Where(image => !retainedImageIds.Contains(image.Id))
                    .ToList();

                foreach (var image in removedImages)
                {
                    await _supabaseStorage.DeleteFileAsync(image.Url);
                    _context.ProductImages.Remove(image);
                }

                var nextPosition = retainedImageIds.Count == 0
                    ? 0
                    : product.ProductImages
                        .Where(image => retainedImageIds.Contains(image.Id))
                        .Select(image => image.Position)
                        .DefaultIfEmpty(-1)
                        .Max() + 1;

                foreach (var image in images)
                {
                    var fileName = BuildFileName(image);
                    var imageUrl = await _supabaseStorage.UploadFileAsync(image, $"product/{product.Id}/{fileName}");

                    _context.ProductImages.Add(new ProductImage
                    {
                        Id = Guid.NewGuid(),
                        ProductId = product.Id,
                        Url = imageUrl,
                        Alt = product.Name,
                        Position = nextPosition++,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            product.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var updatedProduct = await BuildProductQuery(includeInactive: true)
                .FirstAsync(x => x.Id == id);

            return ProductMapper.MapProduct(updatedProduct);
        }

        public async Task<bool> DeleteProductAsync(Guid id)
        {
            var product = await _context.Products
                .Include(x => x.ProductImages)
                .Include(x => x.ProductVariants)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (product == null) return false;

            foreach (var image in product.ProductImages)
                await _supabaseStorage.DeleteFileAsync(image.Url);

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ProductResponseDto?> GetProductDetailsByUrlNameAsync(string urlName)
        {
            var product = await BuildProductQuery(includeInactive: false)
                .FirstOrDefaultAsync(x => x.UrlName == urlName);

            return product == null
                ? null
                : ProductMapper.MapProduct(product);
        }

        public async Task<List<CategoryNamesDto>> GetAllCategoryNamesAsync()
        {
            return await _context.Categories
                .AsNoTracking()
                .OrderBy(x => x.Position)
                .Select(x => new CategoryNamesDto { Id = x.Id, Name = x.Name })
                .ToListAsync();
        }

        // Private helper methods

        private async Task<List<CategoryDto>> GetCategoriesInternalAsync(bool includeInactive)
        {
            var query = _context.Categories.AsNoTracking().AsQueryable();

            if (!includeInactive)
                query = query.Where(x => x.IsActive);

            return await query
                .OrderBy(x => x.Position)
                .Select(x => new CategoryDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    UrlName = x.UrlName,
                    Description = x.Description,
                    ImageUrl = x.ImageUrl,
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt,
                    ProductCount = x.Products.Count(p => p.IsActive),
                    Initials = x.Prefix
                })
                .ToListAsync();
        }

        private static void ValidateProductImages(IReadOnlyCollection<IFormFile> images, long maxTotalSize)
        {
            if (images.Sum(x => x.Length) > maxTotalSize)
                throw new ArgumentException($"The total size of all images must not exceed {maxTotalSize / (1024 * 1024)} MB.");

            foreach (var image in images)
            {
                if (!image.ContentType.StartsWith("image/"))
                    throw new ArgumentException($"'{image.FileName}' is not a valid image.");
            }
        }

        private IQueryable<Product> BuildProductQuery(bool includeInactive, bool includeVariants = true)
        {
            var query = _context.Products
                .AsNoTracking()
                .Include(x => x.ProductImages)
                .Include(x => x.Category)
                .AsQueryable();

            if (includeVariants)
                query = query.Include(x => x.ProductVariants);

            if (!includeInactive)
                query = query.Where(x => x.IsActive);

            return query;
        }

        private static string GenerateNextProductCode(Category category)
        {
            var prefix = $"MIG_{category.Prefix}_";
            category.LastProductNumber += 1;
            return $"{prefix}{category.LastProductNumber:D3}";
        }

        private static string GenerateUrlName(string value)
        {
            var result = value.Trim().ToLowerInvariant();

            result = System.Text.RegularExpressions.Regex.Replace(
                result,
                @"[^a-z0-9\s-]",
                "");

            result = System.Text.RegularExpressions.Regex.Replace(
                result,
                @"\s+",
                "-");

            result = System.Text.RegularExpressions.Regex.Replace(
                result,
                @"-+",
                "-");

            return result.Trim('-');
        }

        private async Task<string> GenerateUniqueCategoryPrefixAsync(string name)
        {
            var baseInitials = GetCategoryInitials(name);
            var candidate = baseInitials;
            var attempt = 1;

            // Load all currently-used prefixes once, so we don't hit the DB in a loop.
            var usedPrefixes = await _context.Categories
                .Select(x => x.Prefix)
                .ToListAsync();

            var usedSet = usedPrefixes.ToHashSet(StringComparer.OrdinalIgnoreCase);

            while (usedSet.Contains(candidate))
            {
                attempt++;
                candidate = $"{baseInitials}{attempt}"; // TE -> TE2 -> TE3 -> TE4 ...
            }

            return candidate;
        }

        private static string GetCategoryInitials(string name)
        {
            var letters = new string(name.Trim().Where(char.IsLetterOrDigit).Take(2).ToArray())
                .ToUpperInvariant();

            return letters.Length > 0 ? letters : "?";
        }

        private static string BuildFileName(IFormFile file)
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            return $"{Guid.NewGuid():N}{extension}";
        }
    }
}