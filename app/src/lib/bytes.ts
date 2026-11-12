/** Dung lượng dễ đọc: 512 B, 180 KB, 4,2 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  // Làm tròn KB trước khi so ngưỡng, để 1023,5 KB trở lên chuyển sang MB thay vì hiện "1024 KB".
  const kb = Math.round(bytes / 1024)
  if (kb < 1024) return `${kb} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
