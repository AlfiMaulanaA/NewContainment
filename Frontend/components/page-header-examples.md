# PageHeader Component Examples

Dokumentasi dan contoh penggunaan komponen `PageHeader` yang telah dibuat untuk memudahkan standardisasi header di seluruh aplikasi.

## Instalasi dan Import

```tsx
import { PageHeader } from "@/components/page-header";
import { HardDrive, Users, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
```

## Contoh Penggunaan

### 1. Header Sederhana

```tsx
<PageHeader 
  icon={Users} 
  title="User Management" 
/>
```

### 2. Header dengan Action Button

```tsx
<PageHeader 
  icon={HardDrive} 
  title="Device Management" 
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Device
    </Button>
  }
/>
```

### 3. Header dengan Subtitle

```tsx
<PageHeader 
  icon={HardDrive} 
  title="Device Management"
  subtitle="Rack A1 - Main Containment"
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Device
    </Button>
  }
/>
```

### 4. Header dengan Back Button

```tsx
<PageHeader 
  icon={HardDrive} 
  title="Device Management"
  subtitle="Rack A1 - Main Containment"
  backButton={{ 
    href: "/management/racks", 
    label: "Back to Racks" 
  }}
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Device
    </Button>
  }
/>
```

### 5. Header dengan Multiple Actions

```tsx
<PageHeader 
  icon={Users} 
  title="User Management"
  actions={
    <div className="flex items-center gap-2">
      <Button variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  }
/>
```

### 6. Header dengan Custom Content

```tsx
<PageHeader 
  title="Custom Management"
  actions={<Button>Action</Button>}
>
  {/* Custom left side content */}
  <SidebarTrigger className="-ml-1" />
  <Separator orientation="vertical" className="mr-2 h-4" />
  <CustomIcon className="h-5 w-5" />
  <div>
    <h1 className="text-lg font-semibold">Custom Title</h1>
    <p className="text-xs text-muted-foreground">Custom subtitle</p>
  </div>
</PageHeader>
```

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `icon` | `LucideIcon` | No | - | Icon dari lucide-react untuk ditampilkan di sebelah title |
| `title` | `string` | Yes | - | Judul utama halaman |
| `subtitle` | `string` | No | - | Subtitle atau context tambahan |
| `backButton` | `{href: string, label?: string}` | No | - | Konfigurasi tombol back |
| `actions` | `React.ReactNode` | No | - | Action buttons di sisi kanan |
| `className` | `string` | No | `""` | CSS class tambahan untuk header |
| `children` | `React.ReactNode` | No | - | Custom content untuk mengganti konten default sisi kiri |

## Implementasi di Halaman Existing

### Before (Manual Header)

```tsx
// Sebelum menggunakan PageHeader
<header className="flex h-16 items-center justify-between border-b px-4">
  <div className="flex items-center gap-2">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mr-2 h-4" />
    
    {rackId && (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/management/racks")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
      </>
    )}

    <HardDrive className="h-5 w-5" />
    <h1 className="text-lg font-semibold">
      Device Management
      {rackId && (
        <span className="text-sm font-normal text-muted-foreground ml-2">
          - {rackName || getRackName(rackId)}
        </span>
      )}
    </h1>
  </div>
  <div className="flex items-center gap-2">
    <Button>Add Device</Button>
  </div>
</header>
```

### After (Using PageHeader)

```tsx
// Setelah menggunakan PageHeader
<PageHeader
  icon={HardDrive}
  title="Device Management"
  subtitle={rackId ? `${rackName || getRackName(rackId)}` : undefined}
  backButton={rackId ? { href: "/management/racks", label: "Back to Racks" } : undefined}
  actions={<Button>Add Device</Button>}
/>
```

## Keuntungan Menggunakan PageHeader

1. **Konsistensi**: Header yang seragam di seluruh aplikasi
2. **Maintainability**: Satu tempat untuk mengubah styling header
3. **Reusability**: Component dapat digunakan di berbagai halaman
4. **Flexibility**: Mendukung berbagai konfigurasi dengan props
5. **Type Safety**: Full TypeScript support dengan interface yang jelas
6. **Responsive**: Otomatis responsive untuk mobile devices
7. **Accessibility**: Built-in accessibility features

## Migration Guide

Untuk migrate halaman existing:

1. Import PageHeader component
2. Replace header manual dengan PageHeader
3. Map props sesuai dengan struktur existing
4. Test functionality (back button, actions, etc.)
5. Remove unused imports (ArrowLeft, SidebarTrigger, dll jika tidak digunakan lagi)

## Best Practices

1. **Consistent Icons**: Gunakan icon yang konsisten untuk module yang sama
2. **Action Placement**: Tempatkan action penting di sebelah kanan
3. **Back Button**: Gunakan back button untuk navigasi hierarchical
4. **Subtitle**: Gunakan subtitle untuk context tambahan yang penting
5. **Mobile Responsive**: Test di mobile untuk memastikan text tidak terpotong