// File: Models/ScannedDevice.cs
// Deskripsi: Model data untuk perangkat yang ditemukan di jaringan.

using System.Collections.Generic;

namespace Backend.Models
{
    public class ScannedDevice
    {
        public required string IpAddress { get; set; }
        public required string MacAddress { get; set; }
        public required string Manufacturer { get; set; }
        public required List<int> OpenPorts { get; set; }
    }
}