/** Một hình chữ nhật theo toạ độ cửa sổ (dp), lấy từ `measureInWindow`. */
export type WindowRect = { x: number; y: number; width: number; height: number };

/** Ảnh chụp màn hình phía sau tấm kính (data-uri JPEG), kèm vị trí nó phủ trên màn hình. */
export type GlassBackdrop = WindowRect & { uri: string };

export type GlassCapture = () => Promise<GlassBackdrop | null>;
