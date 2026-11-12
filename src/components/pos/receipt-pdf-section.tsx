import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { toast } from '@/src/components/ui/toast';
import {
  getReceiptDocument,
  getRefundDocument,
  retryReceiptDocument,
  retryRefundDocument,
  type ReceiptDocument,
} from '@/src/services/cashier-api';
import { useAppTheme } from '@/src/theme/use-theme';
import { Btn } from '../ui/button';
import { Txt } from '../ui/txt';

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

type PdfDoc = Pick<ReceiptDocument, 'status' | 'downloadUrl' | 'errorMessage'>;

/**
 * Khung hiển thị một PDF bất biến do backend lưu (bill thanh toán hoặc phiếu hoàn tiền). Mobile chỉ hiển thị trạng
 * thái và mở URL backend trả về; không tự dựng PDF khác để tránh lệch snapshot.
 */
function PdfDocumentSection({
  title,
  subtitle,
  fetchDoc,
  retryDoc,
  children,
}: {
  title: string;
  subtitle?: string;
  fetchDoc: () => Promise<PdfDoc>;
  retryDoc: () => Promise<PdfDoc>;
  /** Thao tác thêm hiển thị dưới nút xem (vd. in lại phiếu hoàn). */
  children?: ReactNode;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await fetchDoc());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('orders.pdf.loadError'));
    } finally {
      setLoading(false);
    }
  }, [fetchDoc, t]);

  useEffect(() => {
    setDoc(null);
    void load();
  }, [load]);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // presigned URL chỉ sống 10 phút nên lấy lại ngay lúc mở
      const fresh = await fetchDoc();
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
      setDoc(await retryDoc());
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
      <Txt variant="bodyStrong">{title}</Txt>
      {subtitle ? (
        <Txt variant="caption" muted>
          {subtitle}
        </Txt>
      ) : null}
      {content}
      {children}
    </View>
  );
}

/** PDF bill thanh toán của đơn. */
export function ReceiptPdfSection({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const fetchDoc = useCallback(() => getReceiptDocument(orderId), [orderId]);
  const retryDoc = useCallback(() => retryReceiptDocument(orderId), [orderId]);
  return <PdfDocumentSection title={t('orders.pdf.title')} fetchDoc={fetchDoc} retryDoc={retryDoc} />;
}

/** PDF phiếu hoàn tiền của một lượt hoàn (backend lưu sau khi thu ngân xác nhận đã trả tiền). */
export function RefundPdfSection({
  orderId,
  refundId,
  subtitle,
  children,
}: {
  orderId: string;
  refundId: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const fetchDoc = useCallback(() => getRefundDocument(orderId, refundId), [orderId, refundId]);
  const retryDoc = useCallback(() => retryRefundDocument(orderId, refundId), [orderId, refundId]);
  return (
    <PdfDocumentSection title={t('refund.pdf.title')} subtitle={subtitle} fetchDoc={fetchDoc} retryDoc={retryDoc}>
      {children}
    </PdfDocumentSection>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});
