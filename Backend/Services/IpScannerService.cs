
using System;
using System.Net;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Diagnostics;
using Backend.Models; // Menggunakan model data yang baru

namespace Backend.Services
{
    public class IpScannerService
    {
        // Daftar port umum yang akan kita coba pindai.
        private readonly int[] commonPorts = new[] { 80, 443, 22, 23, 3389, 8080 };

        private string GetLocalNetworkPrefix()
        {
            try
            {
                string hostName = Dns.GetHostName();
                IPHostEntry ipHostInfo = Dns.GetHostEntry(hostName);

                foreach (var ip in ipHostInfo.AddressList)
                {
                    if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    {
                        string[] octets = ip.ToString().Split('.');
                        if (octets.Length == 4)
                        {
                            return $"{octets[0]}.{octets[1]}.{octets[2]}.";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saat mendapatkan IP lokal: {ex.Message}");
            }
            return "192.168.0.";
        }

        // Fungsi asinkron untuk melakukan ping ke sebuah alamat IP
        private async Task<bool> IsHostUpAsync(string ipAddress)
        {
            try
            {
                using (var ping = new Ping())
                {
                    PingReply reply = await ping.SendPingAsync(ipAddress, 500); // Timeout 500ms
                    return reply.Status == IPStatus.Success;
                }
            }
            catch (PingException)
            {
                return false;
            }
        }
        
        // Fungsi untuk mendapatkan MAC Address dari IP menggunakan perintah 'arp'
        private string GetMacAddress(string ipAddress)
        {
            string? macAddress = null;
            try
            {
                // Menjalankan perintah 'arp -a'
                var p = new Process
                {
                    StartInfo =
                    {
                        FileName = "arp",
                        Arguments = "-a",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };
                p.Start();
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit();

                // Parsing output untuk menemukan MAC address yang sesuai dengan IP
                var lines = output.Split('\n');
                foreach (var line in lines)
                {
                    if (line.Contains(ipAddress))
                    {
                        // MAC Address biasanya ada di baris yang sama dengan IP
                        var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            macAddress = parts[1];
                            break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saat mendapatkan MAC Address: {ex.Message}");
            }
            return macAddress ?? "Unknown";
        }

        // Fungsi untuk mengidentifikasi produsen dari MAC Address
        private string GetManufacturer(string macAddress)
        {
            if (string.IsNullOrEmpty(macAddress)) return "Unknown";

            // Gunakan kamus sederhana untuk memetakan prefix MAC ke produsen.
            // Untuk data yang lebih akurat, Anda memerlukan database OUI (Organizational Unique Identifier).
            var ouiDatabase = new Dictionary<string, string>
            {
                { "00-00-0C", "Cisco" },
                { "00-1B-44", "Netgear" },
                { "00-A0-C9", "Intel" },
                { "A4-B1-C1", "Apple" },
                { "B8-27-EB", "Raspberry Pi Foundation" }
            };

            // Ambil 6 karakter pertama (3 oktet) dari MAC address
            string macPrefix = macAddress.Substring(0, 8).ToUpper();
            if (ouiDatabase.TryGetValue(macPrefix, out var manufacturer))
            {
                return manufacturer;
            }

            return "Unknown";
        }
        
        // Fungsi asinkron untuk memindai port yang terbuka.
        private async Task<List<int>> ScanOpenPortsAsync(string ipAddress)
        {
            var openPorts = new List<int>();
            var tasks = new List<Task>();
            
            foreach (var port in commonPorts)
            {
                tasks.Add(Task.Run(async () =>
                {
                    using (var client = new TcpClient())
                    {
                        var connectTask = client.ConnectAsync(ipAddress, port);
                        var timeoutTask = Task.Delay(500); // Timeout 500ms

                        if (await Task.WhenAny(connectTask, timeoutTask) == connectTask)
                        {
                            if (client.Connected)
                            {
                                lock(openPorts)
                                {
                                    openPorts.Add(port);
                                }
                            }
                        }
                    }
                }));
            }
            
            await Task.WhenAll(tasks);
            return openPorts.OrderBy(p => p).ToList();
        }

        // Fungsi utama yang dipanggil oleh controller untuk memulai pemindaian.
        public async Task<List<ScannedDevice>> ScanLocalNetworkAsync()
        {
            string networkPrefix = GetLocalNetworkPrefix();
            Console.WriteLine($"Memindai rentang IP: {networkPrefix}1 - {networkPrefix}255");

            var deviceTasks = new List<Task<ScannedDevice?>>();
            for (int i = 1; i <= 255; i++)
            {
                string ipToPing = $"{networkPrefix}{i}";
                deviceTasks.Add(ProcessDeviceAsync(ipToPing));
            }

            var devices = await Task.WhenAll(deviceTasks);
            
            return devices.Where(d => d != null).ToList()!;
        }
        
        // Memproses satu perangkat secara lengkap (ping, mac, port scan)
        private async Task<ScannedDevice?> ProcessDeviceAsync(string ipAddress)
        {
            if (!await IsHostUpAsync(ipAddress))
            {
                return null;
            }
            
            // Perangkat aktif, kumpulkan informasi tambahan
            string macAddress = GetMacAddress(ipAddress);
            string manufacturer = GetManufacturer(macAddress);
            List<int> openPorts = await ScanOpenPortsAsync(ipAddress);

            return new ScannedDevice
            {
                IpAddress = ipAddress,
                MacAddress = macAddress,
                Manufacturer = manufacturer,
                OpenPorts = openPorts
            };
        }
    }
}