using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace MamtasImitationJewelleryBE.Infrastructure.Clients
{
    public class SupabaseStorageClient : IStorageClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _supabaseUrl;
        private readonly string _bucket;
        private readonly ILogger<SupabaseStorageClient> _logger;

        public SupabaseStorageClient(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<SupabaseStorageClient> logger)
        {
            _logger = logger;

            _supabaseUrl = configuration["Supabase:Url"]?.TrimEnd('/')
                ?? throw new InvalidOperationException("Supabase:Url is not configured.");

            _bucket = configuration["Supabase:Bucket"]
                ?? throw new InvalidOperationException("Supabase:Bucket is not configured.");

            var serviceKey = configuration["Supabase:ServiceRoleKey"]
                ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured.");

            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(_supabaseUrl);
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
            _httpClient.DefaultRequestHeaders.Add("apikey", serviceKey);
        }

        public async Task<string> UploadFileAsync(IFormFile file, string storagePath, CancellationToken ct = default)
        {
            using var stream = file.OpenReadStream();
            using var content = new StreamContent(stream);
            content.Headers.ContentType = new MediaTypeHeaderValue(
                string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType);

            var response = await _httpClient.PostAsync(
                $"/storage/v1/object/{_bucket}/{storagePath}?upsert=true",
                content,
                ct);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Supabase upload failed for {Path}: {Error}", storagePath, error);
                throw new InvalidOperationException("Failed to upload image.");
            }

            return $"{_supabaseUrl}/storage/v1/object/public/{_bucket}/{storagePath}";
        }

        public async Task DeleteFileAsync(string? publicUrl, CancellationToken ct = default)
        {
            var storagePath = ExtractStoragePath(publicUrl);
            if (storagePath == null) return;

            var request = new HttpRequestMessage(HttpMethod.Delete, $"/storage/v1/object/{_bucket}")
            {
                Content = JsonContent.Create(new { prefixes = new[] { storagePath } })
            };

            var response = await _httpClient.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode && response.StatusCode != HttpStatusCode.NotFound)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Supabase delete failed for {Path}: {Error}", storagePath, error);
            }
        }

        private string? ExtractStoragePath(string? publicUrl)
        {
            if (string.IsNullOrWhiteSpace(publicUrl)) return null; 

            var marker = $"/storage/v1/object/public/{_bucket}/";
            var idx = publicUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);

            return idx < 0 ? null : publicUrl[(idx + marker.Length)..];
        }
    }
}