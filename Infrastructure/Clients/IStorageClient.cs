namespace MamtasImitationJewelleryBE.Infrastructure.Clients
{
    public interface IStorageClient
    {
        Task<string> UploadFileAsync(IFormFile file, string storagePath, CancellationToken ct = default);
        Task DeleteFileAsync(string? publicUrl, CancellationToken ct = default);
    }
}
