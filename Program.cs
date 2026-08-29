using MamtasImitationJewelleryBE.Data;
using MamtasImitationJewelleryBE.Infrastructure.Clients;
using MamtasImitationJewelleryBE.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

namespace MamtasImitationJewelleryBE
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Configuration.AddJsonFile(
                "appsettings.local.json",
                optional: true,
                reloadOnChange: true);

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Only enabled in dev
            //builder.Services.AddDbContext<ApplicationDbContext>(options =>
            //{
            //    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));

            //    options.EnableDetailedErrors();
            //    options.EnableSensitiveDataLogging();

            //    options.LogTo(
            //        Console.WriteLine,
            //        new[]
            //        {
            //            DbLoggerCategory.Database.Command.Name,
            //            DbLoggerCategory.Update.Name
            //        },
            //        LogLevel.Information
            //    );
            //});

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Business Services
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<CookieService>();
            builder.Services.AddScoped<CurrentUserService>();
            builder.Services.AddScoped<AdminAccessService>();
            builder.Services.AddScoped<UserInitializationService>();
            builder.Services.AddScoped<ProductService>();
            builder.Services.AddScoped<OrderService>();

            // Infrastructure Clients
            builder.Services.AddScoped<IAuthProviderClient, SupabaseAuthClient>();
            builder.Services.AddScoped<IStorageClient, SupabaseStorageClient>();

            // Http Clients
            builder.Services.AddHttpClient();

            var allowedOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>()
                ?? [];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                });
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseCors("AllowFrontend");

            app.MapControllers();

            app.Run();
        }
    }
}
