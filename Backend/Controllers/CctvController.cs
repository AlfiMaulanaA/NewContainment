using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CctvController : ControllerBase
{
    private readonly ICctvService _cctvService;
    private readonly ICctvStreamingService _streamingService;
    private readonly ILogger<CctvController> _logger;

    public CctvController(ICctvService cctvService, ICctvStreamingService streamingService, ILogger<CctvController> logger)
    {
        _cctvService = cctvService;
        _streamingService = streamingService;
        _logger = logger;
    }

    /// <summary>
    /// Mendapatkan semua data CCTV camera
    /// </summary>
    /// <returns>List semua CCTV camera</returns>
    [HttpGet]
    [ProducesResponseType(typeof(List<CctvCameraDto>), 200)]
    public async Task<ActionResult<List<CctvCameraDto>>> GetAll()
    {
        try
        {
            var cameras = await _cctvService.GetAllAsync();
            return Ok(cameras);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all CCTV cameras");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mendapatkan data CCTV camera berdasarkan ID
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Data CCTV camera</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CctvCameraDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CctvCameraDto>> GetById(int id)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            return Ok(camera);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting CCTV camera with ID {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mendapatkan semua CCTV camera dalam containment tertentu
    /// </summary>
    /// <param name="containmentId">ID containment</param>
    /// <returns>List CCTV camera dalam containment</returns>
    [HttpGet("containment/{containmentId}")]
    [ProducesResponseType(typeof(List<CctvCameraDto>), 200)]
    public async Task<ActionResult<List<CctvCameraDto>>> GetByContainment(int containmentId)
    {
        try
        {
            var cameras = await _cctvService.GetByContainmentIdAsync(containmentId);
            return Ok(cameras);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting CCTV cameras for containment {ContainmentId}", containmentId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Membuat CCTV camera baru
    /// </summary>
    /// <param name="dto">Data CCTV camera baru</param>
    /// <returns>Data CCTV camera yang dibuat</returns>
    [HttpPost]
    [ProducesResponseType(typeof(CctvCameraDto), 201)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<CctvCameraDto>> Create([FromBody] CreateUpdateCctvCameraDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var camera = await _cctvService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = camera.Id }, camera);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating CCTV camera");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mengupdate data CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <param name="dto">Data CCTV camera yang diupdate</param>
    /// <returns>Data CCTV camera yang diupdate</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(CctvCameraDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CctvCameraDto>> Update(int id, [FromBody] CreateUpdateCctvCameraDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var camera = await _cctvService.UpdateAsync(id, dto);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            return Ok(camera);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating CCTV camera with ID {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Menghapus CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Status penghapusan</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _cctvService.DeleteAsync(id);
            if (!deleted)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            return Ok(new { message = $"CCTV camera with ID {id} deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting CCTV camera with ID {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mengecek apakah CCTV camera dengan ID tertentu ada
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Status keberadaan CCTV camera</returns>
    [HttpGet("{id}/exists")]
    [ProducesResponseType(typeof(bool), 200)]
    public async Task<ActionResult<bool>> Exists(int id)
    {
        try
        {
            var exists = await _cctvService.ExistsAsync(id);
            return Ok(exists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if CCTV camera exists with ID {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    // ===== STREAMING ENDPOINTS =====

    /// <summary>
    /// Stream video dari CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Video stream</returns>
    [HttpGet("{id}/stream")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> StreamVideo(int id, CancellationToken cancellationToken)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            var stream = await _streamingService.GetStreamAsync(id, cancellationToken);
            if (stream == null)
            {
                return StatusCode(503, new { error = "Stream unavailable or connection failed" });
            }

            var streamInfo = await _streamingService.GetStreamInfoAsync(id);
            var contentType = streamInfo?.ContentType ?? "video/mp4";

            return new FileStreamResult(stream, contentType)
            {
                EnableRangeProcessing = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming video for camera {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mendapatkan informasi stream dari CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Informasi stream</returns>
    [HttpGet("{id}/stream-info")]
    [ProducesResponseType(typeof(CctvStreamInfo), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CctvStreamInfo>> GetStreamInfo(int id)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            var streamInfo = await _streamingService.GetStreamInfoAsync(id);
            if (streamInfo == null)
            {
                return StatusCode(503, new { error = "Stream information unavailable" });
            }

            return Ok(streamInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stream info for camera {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Test koneksi ke CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Status koneksi</returns>
    [HttpGet("{id}/test-connection")]
    [ProducesResponseType(typeof(bool), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<bool>> TestConnection(int id)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            var isConnected = await _streamingService.TestConnectionAsync(id);
            return Ok(new { 
                cameraId = id,
                cameraName = camera.Name,
                isConnected = isConnected,
                testedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection for camera {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Mendapatkan snapshot dari CCTV camera
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>Snapshot image</returns>
    [HttpGet("{id}/snapshot")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(503)]
    public async Task<IActionResult> GetSnapshot(int id)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            var snapshot = await _streamingService.GetSnapshotAsync(id);
            if (snapshot == null)
            {
                return StatusCode(503, new { error = "Snapshot unavailable" });
            }

            return File(snapshot, "image/jpeg", $"camera_{id}_snapshot_{DateTime.UtcNow:yyyyMMdd_HHmmss}.jpg");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting snapshot for camera {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Test koneksi semua CCTV camera
    /// </summary>
    /// <returns>Status koneksi semua camera</returns>
    [HttpGet("test-all-connections")]
    [ProducesResponseType(typeof(List<object>), 200)]
    public async Task<ActionResult> TestAllConnections()
    {
        try
        {
            var cameras = await _cctvService.GetAllAsync();
            var results = new List<object>();

            // Test connections in parallel for better performance
            var tasks = cameras.Select(async camera =>
            {
                var isConnected = await _streamingService.TestConnectionAsync(camera.Id);
                return new
                {
                    cameraId = camera.Id,
                    cameraName = camera.Name,
                    ip = camera.Ip,
                    port = camera.Port,
                    isConnected = isConnected,
                    testedAt = DateTime.UtcNow
                };
            });

            var connectionResults = await Task.WhenAll(tasks);
            results.AddRange(connectionResults);

            var totalCameras = results.Count;
            var onlineCameras = results.Count(r => (bool)r.GetType().GetProperty("isConnected")!.GetValue(r)!);

            return Ok(new
            {
                summary = new
                {
                    totalCameras = totalCameras,
                    onlineCameras = onlineCameras,
                    offlineCameras = totalCameras - onlineCameras,
                    testedAt = DateTime.UtcNow
                },
                cameras = results
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing all camera connections");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Stream MJPEG dari CCTV camera (untuk RTSP streams)
    /// </summary>
    /// <param name="id">ID CCTV camera</param>
    /// <returns>MJPEG stream</returns>
    [HttpGet("{id}/mjpeg")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> StreamMjpeg(int id, CancellationToken cancellationToken)
    {
        try
        {
            var camera = await _cctvService.GetByIdAsync(id);
            if (camera == null)
            {
                return NotFound(new { error = $"CCTV camera with ID {id} not found" });
            }

            // Set response headers for MJPEG streaming
            Response.ContentType = "multipart/x-mixed-replace; boundary=--boundary";
            Response.Headers.Add("Cache-Control", "no-cache, no-store, max-age=0");
            Response.Headers.Add("Pragma", "no-cache");
            Response.Headers.Add("Connection", "close");

            var outputStream = Response.Body;

            // Start MJPEG streaming
            await _streamingService.StreamMjpegAsync(id, outputStream, cancellationToken);

            return new EmptyResult();
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("MJPEG stream cancelled for camera {CameraId}", id);
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming MJPEG for camera {CameraId}", id);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}