# Multiple Tabs Protection untuk GlobalAttendanceLogger

## Overview

GlobalAttendanceLogger sekarang dilengkapi dengan sistem perlindungan multiple tabs untuk mencegah duplikasi processing MQTT messages ketika user membuka multiple browser tabs.

## Features

### 1. Tab Detection & Management
- **Tab ID Generation**: Setiap tab mendapat unique ID saat initialization
- **Active Tab Election**: Hanya satu tab yang menjadi "active handler" pada waktu tertentu
- **Heartbeat System**: Tab aktif mengirim heartbeat setiap 5 detik
- **Automatic Failover**: Jika tab aktif tertutup/crash, tab lain otomatis mengambil alih

### 2. Message Deduplication
- **Message ID Hashing**: Setiap MQTT message di-hash untuk create unique ID
- **Processed Messages Cache**: Menyimpan ID messages yang sudah diproses (max 1000)
- **Duplicate Detection**: Skip processing jika message sudah diproses sebelumnya

### 3. Storage Mechanism
- **LocalStorage**: Menyimpan active tab ID dan heartbeat timestamp
- **SessionStorage**: Menyimpan tab ID individual (per tab)
- **Storage Events**: Listen untuk perubahan active tab di localStorage

## Implementation Details

### Tab States
```typescript
interface TabStates {
  activeTab: boolean;    // Apakah tab ini active handler
  tabId: string;         // Unique identifier untuk tab ini
  heartbeat: number;     // Timestamp terakhir heartbeat
}
```

### Key Methods
- `isActiveTabInstance()`: Check apakah tab ini active
- `getTabId()`: Get unique ID untuk tab ini
- `becomeActiveTab()`: Set tab ini menjadi active handler
- `generateMessageId()`: Create unique ID untuk message deduplication

### Storage Keys
- `global-attendance-logger-tab-id`: Tab ID (session storage)
- `global-attendance-logger-active-tab`: Active tab ID (local storage)
- `global-attendance-logger-heartbeat`: Heartbeat timestamp (local storage)

## How It Works

### Tab Initialization
1. Generate unique tab ID
2. Check apakah ada active tab lain
3. Jika tidak ada atau tab lain sudah stale (>10s), become active
4. Setup event listeners untuk storage changes

### Message Processing Flow
1. **MQTT Message Received** di semua tabs
2. **Active Tab Check**: Hanya active tab yang process
3. **Duplicate Check**: Generate message ID dan check cache
4. **Process Message**: Save ke backend jika belum diproses
5. **Update Cache**: Simpan message ID ke processed cache

### Tab Switching Logic
1. **Tab Close/Refresh**: Remove dari localStorage, stop heartbeat
2. **Tab Visibility**: Check untuk become active saat tab visible
3. **Heartbeat Timeout**: Tab lain detect stale heartbeat dan take over
4. **Storage Events**: Listen untuk active tab changes

## UI Integration

### GlobalAttendanceDemo Component
- Menampilkan tab status (Active Handler/Observer)
- Show tab ID (last 8 chars)
- Display processed messages count
- Test buttons untuk duplicate detection

### Status Indicators
- 🎯 **Active Handler**: Tab yang sedang process messages
- 👁️ **Observer**: Tab yang hanya observe, tidak process
- 🟢 **Pulse**: Heartbeat active indicator

## Testing Multiple Tabs

### Manual Testing
1. Buka 2-3 browser tabs ke `/access-control`
2. Lihat hanya 1 tab yang shows "Active Handler"
3. Close active tab, lihat tab lain take over
4. Click "Test Duplicates" di beberapa tab
5. Verify hanya 1 message yang tersimpan di backend

### Test Scenarios
- **Scenario 1**: Open multiple tabs → Only one active
- **Scenario 2**: Close active tab → Another tab takes over
- **Scenario 3**: Rapid messages → No duplicates saved
- **Scenario 4**: Network disconnect → Proper failover

## Benefits

### 1. No Duplicate Data
- Prevents duplicate attendance logs di database
- Ensures data consistency across tabs

### 2. Resource Efficiency  
- Only one tab processes MQTT messages
- Reduces CPU usage dan network overhead

### 3. Fault Tolerance
- Automatic failover jika active tab crash
- Continues processing di tab lain

### 4. User Experience
- Transparent untuk user
- Works seamlessly across multiple tabs
- Real-time status indicators

## Configuration

### Timeouts
```typescript
const HEARTBEAT_INTERVAL = 5000;      // 5 seconds
const STALE_TIMEOUT = 10000;          // 10 seconds
const MAX_PROCESSED_IDS = 1000;       // Cache size
```

### Storage Cleanup
- Automatic cleanup saat tab close/refresh
- Processed messages cache auto-trim
- No manual maintenance required

## Monitoring

### Debug Logging
- Console logs untuk tab state changes
- MQTT message processing logs
- Duplicate detection notifications

### Stats Tracking
```typescript
{
  isActiveTab: boolean;
  tabId: string;
  processedMessagesCount: number;
  callbackCount: number;
  attendanceCallbackCount: number;
}
```