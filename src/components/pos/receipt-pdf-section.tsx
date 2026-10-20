import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { toast } from '@/src/components/ui/toast';
import {
  getReceiptDocument,
  retryReceiptDocument,
  type ReceiptDocument,
} from '@/src/services/cashier-api';
import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from '../ui/button';
import { Txt } from '../ui/txt';

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

/**
 * Phiếu PDF bất biến do backend lưu cho đơn đã thanh toán. Mobile chỉ hiển thị trạng thái và mở URL backend trả về;
 * không tự dựng PDF khác để tránh lệch snapshot.
 */
export function ReceiptPdfSection({ orderId }: { orderId: string }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [doc, setDoc] = useState<ReceiptDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await getReceiptDocument(orderId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('orders.pdf.loadError'));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    setDoc(null);
    void load();
  }, [load]);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // presigned URL chỉ sống 10 phút nên lấy lại ngay lúc mở
      const fresh = await getReceiptDocument(orderId);
      setDoc(fresh);
      if (fresh.status !== 'READY' || !fresh.downloadUrl) return;
      if (!isAbsoluteUrl(fresh.downloadUrl)) {
        // kho local của backend cần JWT, trình duyệt không gửi được
        toast.info(t('orders.pdf.localStorageHint'), 3, undefined, false);
        return;
      }
      await WebBrowser.openBrowserAsync(fresh.downloadUrl);
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('orders.pdf.loadError'), 3, undefined, false);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setDoc(await retryReceiptDocument(orderId));
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('orders.pdf.loadError'), 3, undefined, false);
    } finally {
      setBusy(false);
    }
  };

  let content;
  if (loading && !doc) {
    content = <ActivityIndicator color={theme.brand_primary} />;
  } else if (error && !doc) {
    content = (
      <>
        <Txt variant="caption" color={theme.brand_error}>
          {error}
        </Txt>
        <Btn label={t('common.retry')} size="sm" variant="ghost" onPress={() => void load()} />
      </>
    );
  } else if (doc?.status === 'READY') {
    content = (
      <Btn label={t('orders.pdf.view')} icon="receipt" block variant="ghost" loading={busy} onPress={() => void open()} />
    );
  } else if (doc?.status === 'FAILED') {
    content = (
      <>
        <Txt variant="caption" color={theme.brand_error}>
          {t('orders.pdf.failed')}
          {doc.errorMessage ? `: ${doc.errorMessage}` : ''}
        </Txt>
        <Btn label={t('orders.pdf.retry')} icon="refresh" size="sm" variant="ghost" loading={busy} onPress={() => void retry()} />
      </>
    );
  } else if (doc?.status === 'PENDING') {
    content = (
      <>
        <Txt variant="caption" muted>
          {t('orders.pdf.generating')}
        </Txt>
        <Btn label={t('orders.pdf.refresh')} icon="refresh" size="sm" variant="ghost" onPress={() => void load()} />
      </>
    );
  } else if (doc?.status === 'DISABLED') {
    content = (
      <Txt variant="caption" muted>
        {t('orders.pdf.disabled')}
      </Txt>
    );
  }

  return (
    <View style={[styles.box, { borderColor: theme.border_color_thin }]}>
      <Txt variant="bodyStrong">{t('orders.pdf.title')}</Txt>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});
