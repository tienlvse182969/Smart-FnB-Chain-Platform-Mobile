declare module 'upng-js' {
  type DecodedPng = { width: number; height: number };

  const UPNG: {
    decode(buffer: ArrayBuffer): DecodedPng;
    /** Mỗi phần tử là một khung hình RGBA 8 bit; ảnh tĩnh chỉ có một khung. */
    toRGBA8(png: DecodedPng): ArrayBuffer[];
  };

  export default UPNG;
}
