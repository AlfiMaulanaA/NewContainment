// File: Controllers/IpScannerController.cs
// Deskripsi: API controller untuk mengekspos endpoint pemindaian IP.

using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.Models; // Menggunakan model data yang baru
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IpScannerController : ControllerBase
    {
        private readonly IpScannerService _ipScannerService;

        public IpScannerController(IpScannerService ipScannerService)
        {
            _ipScannerService = ipScannerService;
        }

        [HttpGet("scan")]
        public async Task<IActionResult> ScanNetwork()
        {
            List<ScannedDevice> activeDevices = await _ipScannerService.ScanLocalNetworkAsync();

            if (activeDevices.Count > 0)
            {
                return Ok(activeDevices);
            }
            else
            {
                return NotFound("Tidak ada perangkat aktif yang ditemukan.");
            }
        }
    }
}
