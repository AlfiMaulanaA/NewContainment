Tentu, berikut adalah dokumentasi MQTT yang telah dibuat ulang dalam format Markdown, siap untuk digunakan di platform seperti GitHub, GitLab, atau lainnya.

---

# Dokumentasi Komunikasi MQTT Containment

Dokumen ini menjelaskan topik dan struktur payload MQTT yang digunakan untuk komunikasi antara middleware dan klien dalam sistem kontrol containment.

## 1\. Monitoring Containment (Publikasi)

Topik utama untuk memonitor status real-time dari semua komponen fisik.

- **Topik**: `IOT/Containment/Status`
- **Payload**: Objek JSON yang berisi status dari berbagai komponen.

<!-- end list -->

```json
{
  "Lighting status": true,
  "Emergency status": true,
  "Smoke Detector status": false,
  "FSS status": false,
  "Emergency Button State": false,
  "selenoid status": true,
  "limit switch front door status": true,
  "limit switch back door status": true,
  "open front door status": false,
  "open back door status": false,
  "Emergency temp": false,
  "Emergency bms": false,
  "Timestamp": "2024-06-07 10:06:49"
}
```

---

## 2\. Kontrol Containment (Langganan)

Topik ini digunakan oleh klien untuk mengirimkan perintah kontrol ke sistem.

- **Topik**: `IOT/Containment/Control`
- **Payload**: Objek JSON dengan kunci `data` yang berisi string perintah.

| Perintah                                 | Payload JSON                                 | Deskripsi                                      |
| :--------------------------------------- | :------------------------------------------- | :--------------------------------------------- |
| **Buka Pintu Depan**                     | `{"data": "Open front door"}`                | Membuka pintu depan.                           |
| **Buka Pintu Belakang**                  | `{"data": "Open back door"}`                 | Membuka pintu belakang.                        |
| **Pintu Depan Selalu Terbuka (Enable)**  | `{"data": "Open front door always enable"}`  | Mengaktifkan mode pintu depan selalu terbuka.  |
| **Pintu Depan Selalu Terbuka (Disable)** | `{"data": "Open front door always disable"}` | Menonaktifkan mode pintu depan selalu terbuka. |
| **Buka Selenoid Plafon**                 | `{"data": "Open Ceiling"}`                   | Membuka selenoid di plafon.                    |
| **Tutup Selenoid Plafon**                | `{"data": "Close Ceiling"}`                  | Menutup selenoid di plafon.                    |
| **Dapatkan Status Terkini**              | `{"data": "Get Data"}`                       | Meminta status terkini dari semua komponen.    |
| **Perbarui Konfigurasi Sistem**          | `{"data": "Change config system"}`           | Memuat ulang konfigurasi dari file JSON.       |

---

## 3\. Konfigurasi Sistem (Langganan)

Topik untuk mengubah parameter konfigurasi sistem secara spesifik.

- **Topik**: `IOT/Containment/Control/Config`
- **Payload**: Objek JSON dengan kunci `data` (nama parameter) dan `value` (nilai baru).

| Parameter                     | Payload JSON                                        | Deskripsi                                            |
| :---------------------------- | :-------------------------------------------------- | :--------------------------------------------------- |
| **Interval Kontrol Lampu**    | `{"data": "interval_control_light", "value": 60}`   | Mengatur interval kontrol lampu dalam detik.         |
| **Interval Kontrol Selenoid** | `{"data": "interval_control_selenoid", "value": 5}` | Mengatur interval kontrol selenoid dalam detik.      |
| **Ambang Batas Suhu Atas**    | `{"data": "temp_upper_threshold", "value": 40.0}`   | Mengatur ambang batas suhu atas untuk mode darurat.  |
| **Ambang Batas Suhu Bawah**   | `{"data": "temp_bottom_threshold", "value": 50.0}`  | Mengatur ambang batas suhu bawah untuk mode darurat. |
| **Dapatkan Data Pengaturan**  | `{"data": "Get Data Setting"}`                      | Meminta pengaturan sistem saat ini.                  |

### Respons Konfigurasi

- **Topik**: `IOT/Containment/Control/Current_Config`
- **Payload**: Objek JSON yang berisi semua pengaturan sistem saat ini.

<!-- end list -->

```json
{
  "modular_i2c_address_1": 34,
  "modular_i2c_address_2": 37,
  "modular_i2c_relay_1_address": 57,
  "debug": true,
  "interval_control_light": 120,
  "interval_control_selenoid": 2,
  "interval_door_lock": 4,
  "interval_open_front_door": 2,
  "interval_open_back_door": 2,
  "temp_emergency": true,
  "temp_upper_threshold": 60,
  "temp_bottom_threshold": 50
}
```

---

## 4\. Konfigurasi Pin (Langganan & Publikasi)

Topik untuk mengelola konfigurasi pin perangkat keras.

### Permintaan

- **Topik**: `IOT/Containment/Control/Config/Pin`
- **Payload**:
  - **Baca Pengaturan**: `{"data": "Get Data Setting"}`
  - **Tulis Pengaturan**: `{"data": "Change Setting Pin", "value": {...}}`

### Respons

- **Topik**: `IOT/Containment/Control/Current_Config/Pin`
- **Payload**:
  - **Respons Berhasil**: `{"succes": true, "result": "no error success write to system"}`
  - **Respons Gagal**: `{"succes": false, "result": "error, there are same pin on your setting relay mini"}`
  - **Baca Pengaturan**: Objek JSON yang berisi pengaturan pin saat ini.

---

## 5\. Kontrol Akses (Langganan & Publikasi)

### Sidik Jari

- **Topik Perintah**: `IOT/Containment/Accescontrolcommand_`
- **Topik Respons**: `updateFP_`

| Perintah                  | Payload Perintah     | Respons Berhasil                                      |
| :------------------------ | :------------------- | :---------------------------------------------------- |
| **Ubah ke Mode Register** | `modeFP;Register`    | `{"Mode": "Register", "Status": "Succes", "ID": "6"}` |
| **Ubah ke Mode Delete**   | `modeFP;DeleteID`    | `{"Mode": "Delete", "Status": "Succes", "ID": "2"}`   |
| **Hapus ID Tertentu**     | `modeFP;DeleteID;2;` | `{"Mode": "Delete", "Status": "Succes", "ID": "2"}`   |
| **Ubah ke Mode Scan**     | `modeFP;Scan`        | `{"Mode": "Scan", "Status": "Running Mode"}`          |

### RFID dan NFC

- **Topik Perintah**: `IOT/Containment/Accescontrolcommand_`
- **Topik Respons**: `updateRFID_`

| Perintah                  | Payload Perintah    | Respons Berhasil                                                            |
| :------------------------ | :------------------ | :-------------------------------------------------------------------------- |
| **Ubah ke Mode Register** | `modeRFID;Register` | `{"Mode": "Register", "Status": "Succes", "UID": "0xbd 0x12 0x0c 0xba"}`    |
| **Ubah ke Mode Delete**   | `modeRFID;Delete`   | `{"Mode": "Delete", "Status": "Succes", "UID Card": "0xbd 0x12 0x0c 0xba"}` |
| **Ubah ke Mode Scan**     | `modeRFID;Scan`     | `{"Mode": "Scan", "Status": "Running Mode"}`                                |

### BLE (Belum Diimplementasikan)

- **Topik Perintah**: `IOT/Containment/Accescontrolcommand`
- **Topik Respons**: `updateBLE`

---

## 6\. Sensor Suhu & Kelembaban (Publikasi)

Sistem secara otomatis memublikasikan data dari setiap sensor yang terpasang.

- **Topik**: `Containment/Sensor/Temperature_rack_n` (di mana `n` adalah nomor rak)
- **Payload**: Objek JSON yang berisi data sensor.

<!-- end list -->

```json
{
  "temp": 26.0,
  "hum": 50.0,
  "Timestamp": "2023-10-12 16:41:41"
}
```

---

## 7\. Kontrol Akses Ganda ZKTECO

Sistem ini mengelola dua perangkat kontrol akses ZKTECO (depan dan belakang) secara terpusat.

### Log Absensi (Publikasi)

- **Topik**: `acs_front_attendance` & `acs_rear_attendance`
- **Payload**: `{"Mode": "scan", "Status": "check_in", "Data": {"UID": "2", "timestamp ": "2024-03-04 14:55:12"}}`

### Manajemen Pengguna (Perintah & Respons)

- **Topik Perintah**: `acs_front_command`
- **Topik Respons**: `acs_front_status` & `acs_rear_status`

| Perintah              | Payload Perintah                  | Respons ZKTECO Depan & Belakang                                                           |
| :-------------------- | :-------------------------------- | :---------------------------------------------------------------------------------------- |
| **Buat Pengguna**     | `mode;create_user;bento;12345678` | `{"Mode": "create_user", "Status": "success", "Data": {"UID": 4, "user_name ": "bento"}}` |
| **Hapus Pengguna**    | `mode;delete_user;4`              | `{"Mode": "delete_user", "Status": "success", "Data": {"UID": 4, "user_name ": "bento"}}` |
| **Daftar Sidik Jari** | `mode;register_fp;4;6`            | `{"Mode": "register_fp", "Status": "success", "Data": {"uid": 4, "fid": 6}}`              |
| **Hapus Sidik Jari**  | `mode;delete_fp;4;6`              | `{"Mode": "delete_fp", "Status": "success", "Data": {"uid": 4, "fid": 6}}`                |
| **Daftar Kartu**      | `mode;register_card;4`            | `{"Mode": "register_card", "Status": "success", "Data": {"uid": 4, "card": 8881701}}`     |
| **Hapus Kartu**       | `mode;delete_card;4`              | `{"Mode": "delete_card", "Status": "success", "Data": data}`                              |

# `Sensor Temp Hum Containment`

This document outlines the MQTT commands for the `Sensor Temp Hum Containment` program. This program allows users to configure and manage temperature and humidity sensors installed in a containment system. It supports two main modes: **Reading Sensor** and **Scan Address**. The program uses MQTT for all communication and configuration.

All command responses are sent to the topic: `IOT/Containment/Sensor/Config/Data`.

---

## Program Modes

The program operates in two primary modes.

### Mode 1: Reading Sensor

This is the default mode. The program reads sensor data based on the configurations in the `SensorList.json` file.

### Mode 2: Scan Address

This mode allows the program to scan for and identify Modbus RTU sensor addresses to simplify installation.

### Changing Modes

To switch between modes, use the following commands:

- **Change to Reading Sensor mode**

  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "change mode to reading sensor"}`
  - **Response (Success):** `{"result": "success,", "command": "change mode to reading sensor"}`

- **Change to Scan Address mode**
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "change mode to scan"}`
  - **Response (Success):** `{"result": "success,", "command": "change mode to scan"}`

---

## `Reading Sensor` Mode Commands

In this mode, you can manage the `SensorList.json` file, which contains the parameters for all the connected sensors.

### Get Sensor Information

- **Get Total Sensor List**

  - Retrieves all sensor parameters from `SensorList.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "get total sensor list"}`
  - **Response (Success):** Returns a JSON object with a list of all sensor profiles and protocol settings.

- **Get a Specific Sensor's Details**
  - Retrieves the full configuration for a single sensor.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "get sensor list", "data": {"number_sensor": 1}}`
  - **Response (Success):** Returns a JSON object with the complete details of the requested sensor.

### Modify Sensor List

- **Set Sensor List**

  - Updates the parameters for an existing sensor.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** A JSON object with the command and the complete sensor data to update, including `number_sensor` and `data_sensor`.
  - **Response (Success):** Returns the updated sensor data.

- **Add Sensor to List**

  - Adds a new sensor configuration to `SensorList.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** A JSON object with the command and the complete new sensor data, including `number_sensor` and `data_sensor`.
  - **Response (Success):** Returns the newly added sensor data.

- **Remove Sensor from List**

  - Deletes a sensor's configuration from `SensorList.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "remove sensor list", "data": {"number_sensor": 6}}`
  - **Response (Success):** `{"result": "success,", "command": "remove sensor list"}`

- **Upload Sensor List**
  - Loads the latest `SensorList.json` file into the program. This is required after making any changes to the sensor list.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "upload sensor list"}`
  - **Response (Success):** `{"result": "success,", "command": "remove sensor list"}`

---

## `Scan Address` Mode Commands

When in **Scan Address** mode, you can perform and manage the scanning process.

### Manage Scanning

- **Start Scanning**

  - Begins the sensor address scanning process based on the parameters in `config_sensor.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "running scan"}`
  - **Response (Success):** The program will publish a message for each address scanned. If an address is detected, the response will be `{"result": "success, data reading with value,1", "command": "scan for sensor: XY_MD02"}`.

- **Stop Scanning**
  - Stops an ongoing scanning process.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "stop scan"}`
  - **Response (Success):** `{"result": "success,", "command": "stop sensor list"}`

### Configure Scanning Parameters

The `config_sensor.json` file dictates the scanning behavior, including `max_address_to_scan`, `selected_port`, and `selected_sensor`.

- **Write Scan Configuration**

  - Updates the parameters in `config_sensor.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** A JSON object with the command and a complete `data` object containing all the new configuration parameters for scanning.
  - **Response (Success):** `{"result": "success,", "command": "write config scan"}`

- **Read Scan Configuration**
  - Retrieves the current scanning parameters from `config_sensor.json`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "read config scan"}`
  - **Response (Success):** Returns a JSON object with the full contents of `config_sensor.json`.

---

## Sensor Calibration

You can read and write calibration values for each sensor. The calibration value is an offset that is added to the raw sensor reading.

- **Read Calibration Values**

  - Retrieves the calibration values for all sensors. The response is a JSON object where each sensor name maps to an array of two values: `[temperature_calibration_value, humidity_calibration_value]`.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "read calibrate sensor"}`
  - **Response (Success):** Returns a JSON object with all sensor calibration values.

- **Write Calibration Value**
  - Sets the calibration values for a specific sensor.
  - **Topic:** `IOT/Containment/Sensor/Config`
  - **Payload:** `{"command": "write calibrate sensor", "data": {"sensor_name": "Temperature_Sensor_1", "value_calibrate": [-10, -10]}}`
  - **Response (Success):** Returns a JSON object showing the updated calibration values for all sensors.
