import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { PrinterError } from '@/src/services/printer/bluetooth-printer';
import { CAPTURE_SCALE, PRINT_WIDTH_DOTS } from '@/src/services/printer/raster';

type Job = {
  sheets: ReactElement[];
  resolve: (pngs: string[]) => void;
  reject: (reason: unknown) => void;
};

/** Chờ font, ảnh và QR vẽ xong trước khi chụp. */
const SETTLE_MS = 400;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let enqueue: ((sheets: ReactElement[]) => Promise<string[]>) | null = null;

/**
 * Dựng các phiếu thành ảnh PNG (base64), mỗi phiếu một ảnh, để `raster.ts` đổi sang bitmap cho máy in.
 * Cần `ReceiptPrintHost` đang được gắn trong cây giao diện; các yêu cầu được xếp hàng, chạy lần lượt.
 */
export function renderToPrintImages(sheets: ReactElement[]): Promise<string[]> {
  if (!enqueue) return Promise.reject(new PrinterError('Chưa sẵn sàng dựng ảnh để in.'));
  return enqueue(sheets);
}

/**
 * Vùng dựng phiếu nằm ngoài màn hình (không dùng `display: none` vì Android không chụp được view ẩn).
 * Gắn một lần ở layout của thu ngân.
 */
export function ReceiptPrintHost() {
  const [job, setJob] = useState<Job | null>(null);
  const nodes = useRef<(View | null)[]>([]);
  const heights = useRef<number[]>([]);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    enqueue = (sheets) => {
      const run = () =>
        new Promise<string[]>((resolve, reject) => {
          nodes.current = [];
          heights.current = [];
          setJob({ sheets, resolve, reject });
        });
      const result = chain.current.then(run, run);
      chain.current = result.catch(() => undefined);
      return result;
    };
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => {
    if (!job) return;
    (async () => {
      try {
        await sleep(SETTLE_MS);
        const pngs: string[] = [];
        for (let i = 0; i < job.sheets.length; i += 1) {
          const node = nodes.current[i];
          const height = heights.current[i];
          if (!node || !height) throw new PrinterError('Không dựng được ảnh bill để in.');
          pngs.push(
            await captureRef(node, {
              format: 'png',
              result: 'base64',
              width: PRINT_WIDTH_DOTS * CAPTURE_SCALE,
              height: Math.round(height * CAPTURE_SCALE),
            }),
          );
        }
        job.resolve(pngs);
      } catch (failure) {
        job.reject(failure);
      } finally {
        setJob(null);
      }
    })();
  }, [job]);

  if (!job) return null;
  return (
    <View pointerEvents="none" style={styles.offscreen}>
      {job.sheets.map((sheet, index) => (
        <View
          key={index}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          collapsable={false}
          onLayout={(event) => {
            heights.current[index] = event.nativeEvent.layout.height;
          }}
          style={styles.sheet}>
          {sheet}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0, width: PRINT_WIDTH_DOTS },
  sheet: { width: PRINT_WIDTH_DOTS, backgroundColor: '#FFFFFF' },
});
