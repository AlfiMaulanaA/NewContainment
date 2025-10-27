# Dokumentasi Penggunaan Program Palm Recognition (dengan MQTT)

## 🔧 Deskripsi Umum
Program ini mendeteksi telapak tangan (palm recognition) menggunakan sensor IR dan RGB. Sistem mengekstrak fitur biometrik, menyimpan gambar, dan melakukan pendaftaran atau pencocokan dengan database. Komunikasi perintah dan hasil dilakukan melalui MQTT.

## 📸 Penyimpanan Gambar IR & RGB
Ketika telapak tangan valid terdeteksi (semua telapak tangan walaupun yang belum terdaftar), sistem akan:
- Menyimpan gambar RGB: `1.rgb.png`
- Menyimpan gambar IR: `1.ir.png`
- Visualisasi dilakukan via `viewer_->ShowRgbImage_` dan `viewer_->ShowU8Image_`

## 🔌 MQTT Configuration
**File:** `mqtt_config.json`

```json
{
  "enable": true,
  "broker_address": "localhost",
  "broker_port": 1883,
  "username": "1",
  "password": "3",
  "qos": 1,
  "retain": false,
  "pub_topic_status": "palm/status",
  "pub_topic_result": "palm/compare/result",
  "sub_topic": "palm/control"
}
```


## 🔌 Komunikasi MQTT

### Saat Inisialisasi
- Membaca konfigurasi dari file `mqtt_config.json`
- Menginisialisasi koneksi ke MQTT broker
- Subscribe ke `sub_topic` untuk menerima perintah
- Mengirim pesan status awal ke `pub_topic_status`

### Topik MQTT

| Jenis | Topik | Format Payload |
|-------|-------|----------------|
| Subscribe | `sub_topic` | JSON dengan command |
| Publish | `pub_topic_status` | JSON status |
| Publish | `pub_topic_result` | Hasil pengenalan |


## 📝 Perintah yang Didukung

### 1. Regist
Masuki mode pendaftaran, menyimpan fitur IR+RGB ke database saat palm valid dideteksi.

```json
{
  "command": "regist",
  "user_id": "user123"
}
```

### 2. Delete
Menghapus data user dari database.

```json
{
  "command": "delete",
  "user_id": "user123"
}
```


## 📤 Format Publish MQTT

### 1. Status (`pub_topic_status`)
Program mengirim status operasional dalam format JSON sederhana:

```json
{"status":"ok","message":"PalmDevice is ready"}
{"status":"failed","message":"SQL prepare error"}
```

### 2. Hasil Pencocokan (`pub_topic_result`)
Ketika sistem melakukan pencocokan telapak tangan dengan data pada database SQLite dan menemukan kecocokan terbaik, maka hasilnya akan dipublish ke MQTT dalam format:

```json
{
  "user": "user123",
  "score": 0.9273,
  "timestamp": "2025-05-23T10:30:12Z"
}
```

| Field | Keterangan |
|-------|------------|
| `user` | ID user yang paling cocok |
| `score` | Skor rata-rata dari IR dan RGB (0.0 - 1.0) |
| `timestamp` | Waktu hasil dikirim |

> **📝 Catatan:** Publish akan dilakukan hanya jika waktu jeda (publish delay) terpenuhi, dan akan disesuaikan berdasarkan nilai skor.

## 📤 Daftar Payload `pub_topic_status` (MQTT)

Topik ini digunakan untuk mengirimkan status operasional dan hasil proses perintah. Semua pesan ini dikirim oleh objek PalmDevice melalui fungsi `mqtt_->publish(cfg.pub_topic_status, ...)`.

### 🔄 Ringkasan Format Payload

```json
{
  "status": "ok" | "failed",
  "message": "penjelasan status"
}
```

### Status Messages

#### ✅ Successful States

**`{"status": "ok", "message": "PalmDevice is ready"}`**
- Sistem berhasil melakukan inisialisasi
- Koneksi MQTT berhasil
- Langganan (subscribe) ke sub_topic berhasil

**`{"status": "ok", "message": "successfully set to regist mode"}`**
- Menerima perintah regist dari MQTT
- `user_id` valid dan belum terdaftar di database

**`{"status": "ok", "message": "user successfully registered"}`**
- Setelah proses registrasi fitur palm (IR + RGB)
- Penyimpanan ke database berhasil dilakukan

**`{"status": "ok", "message": "user deleted"}`**
- Setelah menerima perintah delete
- Data user berhasil dihapus dari database

#### ❌ Error States

**`{"status": "failed", "message": "user already registered"}`**
- Menerima perintah regist, tetapi `user_id` sudah ada di database
- Registrasi tidak dilanjutkan

**`{"status": "failed", "message": "'user_id' missing in regist command"}`**
- Payload MQTT perintah regist tidak mengandung field `user_id`

**`{"status": "failed", "message": "'user_id' missing for delete command"}`**
- Payload MQTT perintah delete tidak mengandung field `user_id`

**`{"status": "failed", "message": "SQL prepare error"}`**
- Kesalahan saat mempersiapkan query SQLite
- Biasanya disebabkan oleh query yang salah atau struktur database yang tidak cocok

**`{"status": "failed", "message": "Failed to open database"}`**
- File database SQLite `palm_feature.db` tidak bisa dibuka
- Bisa karena file tidak ada, korup, atau masalah izin akses



## 📌 Tips Tambahan

- Semua payload status dikirim dalam bentuk string JSON
- Gunakan `mosquitto_sub -t palm/status` untuk melihat status secara real-time saat debugging
- Jika status `failed` sering muncul, periksa:
  - Struktur dan isi file `mqtt_config.json`
  - Izin akses ke database
  - Format payload MQTT yang dikirim

## 🧠 Mode Operasi

| Mode | Aksi |
|------|------|
| **Regist** | Simpan fitur telapak tangan (IR + RGB) ke database |
| **Recognition** | Bandingkan dengan database dan kirim hasil terbaik via MQTT |
| **Auto Save Gambar** | Simpan file gambar `.png` saat palm valid terdeteksi dan divisualisasi |

## 🗄️ Database SQLite

**Database:** `palm_feature.db`

**Tabel:** `Usr`
- `id TEXT` - ID user
- `ir_feature TEXT` - Fitur ekstraksi dari gambar IR
- `rgb_feature TEXT` - Fitur ekstraksi dari gambar RGB

## ⛓️ Siklus Operasi Sistem

```
Deteksi palm (IR + RGB)
    ↓
Jika palm valid:
    ├── Simpan gambar IR dan RGB
    ├── Jika mode regist aktif → simpan ke database
    ├── Jika mode recognition aktif → bandingkan dengan database
    └── Kirim hasil pencocokan ke pub_topic_result
```

---

> Jika Anda memerlukan diagram alur, contoh data Usr dari SQLite, atau template MQTT testing menggunakan mosquitto_pub / mosquitto_sub, saya bisa bantu.

## 🚀 Cara Menjalankan Program Palm Recognition Secara Manual

Untuk menjalankan program palm recognition secara manual (tanpa integrasi otomatis), ikuti langkah berikut:

### 📂 Working Directory
Masuk ke direktori build dari sample SDK:
```bash
cd ~/palm-sdk-vp930pro-linux-aarch64-v1.3.41-P_20250505/samples/src/sample/build
```

Direktori ini adalah tempat file `palm_test` (binary executable) berada setelah proses build SDK berhasil.

### ▶️ Menjalankan Program
Setelah berada di direktori tersebut, jalankan program dengan perintah:
```bash
./palm_test
```

### 📝 Catatan Penting
- Program akan memuat konfigurasi dari file `mqtt_config.json` yang harus berada di direktori yang sama atau path yang disesuaikan di kode
- Jika Anda belum membuat database `palm_feature.db`, maka file tersebut akan dibuat secara otomatis saat proses registrasi user pertama kali berhasil
- Harus ada file config yang ada di folder `config` untuk mendukung kerja hardware sensor

Saat dijalankan:
- Program akan terkoneksi ke broker MQTT
- Antarmuka web stream akan aktif (jika tidak dinonaktifkan)
- Perintah `regist` dan `delete` bisa mulai dikirim melalui MQTT sesuai format yang sudah dijelaskan sebelumnya
