import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { toast } from '@/src/components/ui/toast';
import { Txt } from '@/src/components/ui/txt';
import {
  BUILTIN_ADDRESS,
  clearPrinterConfig,
  loadPrinterConfig,
  savePrinterConfig,
  toPrintFailure,
  type PrinterConfig,
  type PrinterDevice,
  type PrinterTransport,
  type PrintFailure,
  type PrintMode,
} from '@/src/services/printer/printer-core';
import { getBuiltInPrinterName, requestUsbPermission } from '@/src/services/printer/native-transport';
import { printTestPage } from '@/src/services/printer/print-service';
import { listPrinters } from '@/src/services/printer/transport';
import { useAppTheme } from '@/src/theme/use-theme';
import { PrintErrorDialog } from './print-error-dialog';

/** Mục "Máy in hóa đơn" trong Tài khoản của thu ngân: chọn máy in (Bluetooth / USB / tích hợp), kiểu chữ, in thử. */
export function PrinterCard() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [transport, setTransport] = useState<PrinterTransport>('BLUETOOTH');
  const [devices, setDevices] = useState<PrinterDevice[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testFailure, setTestFailure] = useState<PrintFailure | null>(null);

  useEffect(() => {
    void loadPrinterConfig().then(setConfig);
  }, []);

  const loadDevices = useCallback(
    async (next: PrinterTransport) => {
      setTransport(next);
      setDevices(null);
      setLoadError(null);
      try {
        if (next === 'BUILTIN') {
          const name = await getBuiltInPrinterName();
          setDevices(name ? [{ address: BUILTIN_ADDRESS, name }] : []);
        } else {
          setDevices(await listPrinters(next));
        }
      } catch (failure) {
        setDevices([]);
        setLoadError(failure instanceof Error && failure.message ? failure.message : t('printer.loadFailed'));
      }
    },
    [t],
  );

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    void loadDevices(config?.transport ?? 'BLUETOOTH');
  }, [config?.transport, loadDevices]);

  const choose = async (device: PrinterDevice) => {
    if (transport === 'USB') {
      // Xin quyền ngay bây giờ để lúc thanh toán không bị hộp thoại hệ thống chen ngang.
      try {
        await requestUsbPermission(device.address);
      } catch (failure) {
        toast.fail(failure instanceof Error ? failure.message : t('printer.loadFailed'), 3, undefined, false);
        return;
      }
    }
    const next: PrinterConfig = {
      transport,
      address: device.address,
      name: device.name,
      printMode: config?.printMode ?? 'image',
    };
    await savePrinterConfig(next);
    setConfig(next);
    setPickerOpen(false);
  };

  const changeMode = async (printMode: PrintMode) => {
    if (!config) return;
    const next = { ...config, printMode };
    await savePrinterConfig(next);
    setConfig(next);
  };

  const remove = async () => {
    await clearPrinterConfig();
    setConfig(null);
  };

  const testPrint = async () => {
    if (!config || testing) return;
    setTesting(true);
    try {
      await printTestPage(config);
      toast.success(t('printer.testPrinted'), 1.5, undefined, false);
    } catch (failure) {
      setTestFailure(toPrintFailure(failure));
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
        {t('printer.section')}
      </Txt>
      <View style={[styles.card, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
        <View style={styles.row}>
          <Icon name="print" size={18} />
          <View style={styles.text}>
            <Txt variant="body">{config?.name ?? t('printer.none')}</Txt>
            <Txt variant="tiny" muted>
              {config
                ? config.transport === 'BUILTIN'
                  ? t('printer.transport.BUILTIN')
                  : `${t(`printer.transport.${config.transport}`)} · ${config.address}`
                : t('printer.noneHint')}
            </Txt>
          </View>
        </View>

        <Btn
          label={config ? t('printer.change') : t('printer.choose')}
          icon="print"
          variant={config ? 'ghost' : 'primary'}
          block
          onPress={openPicker}
          style={styles.button}
        />

        {config ? (
          <>
            <Txt variant="caption" muted style={styles.label}>
              {t('printer.printMode')}
            </Txt>
            <Segmented<PrintMode>
              value={config.printMode}
              onChange={(mode) => void changeMode(mode)}
              options={[
                { value: 'image', label: t('printer.modeImage') },
                { value: 'text', label: t('printer.modeText') },
              ]}
            />
            <Txt variant="tiny" muted>
              {t(config.printMode === 'image' ? 'printer.modeImageHint' : 'printer.modeTextHint')}
            </Txt>
            <View style={styles.actions}>
              <Btn label={t('printer.remove')} variant="plain" onPress={() => void remove()} />
              <Btn label={t('printer.testPrint')} icon="print" loading={testing} onPress={() => void testPrint()} />
            </View>
          </>
        ) : null}
      </View>

      <PrintErrorDialog
        failure={testFailure}
        onClose={() => setTestFailure(null)}
        onRetry={() => {
          setTestFailure(null);
          void testPrint();
        }}
      />

      <AppModal
        visible={pickerOpen}
        title={t('printer.pickTitle')}
        icon="print"
        onClose={() => setPickerOpen(false)}
        maxWidth={460}
        actions={[{ text: t('common.close'), onPress: () => setPickerOpen(false) }]}>
        <Segmented<PrinterTransport>
          value={transport}
          onChange={(next) => void loadDevices(next)}
          options={[
            { value: 'BLUETOOTH', label: t('printer.transport.BLUETOOTH') },
            { value: 'USB', label: t('printer.transport.USB') },
            { value: 'BUILTIN', label: t('printer.transport.BUILTIN') },
          ]}
          style={styles.transports}
        />
        <ScrollView style={styles.list}>
          {devices === null ? (
            <ActivityIndicator color={theme.brand_primary} />
          ) : devices.length === 0 ? (
            <Txt variant="caption" muted>
              {loadError ?? t(`printer.pickEmpty.${transport}`)}
            </Txt>
          ) : (
            devices.map((device) => (
              <Pressable
                key={device.address}
                onPress={() => void choose(device)}
                style={({ pressed }) => [
                  styles.device,
                  { borderBottomColor: theme.border_color_thin },
                  pressed && { opacity: 0.55 },
                ]}>
                <Txt variant="body">{device.name}</Txt>
                {transport === 'BUILTIN' ? null : (
                  <Txt variant="tiny" muted>
                    {device.address}
                  </Txt>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 16, gap: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, gap: 2 },
  button: { marginTop: 10 },
  label: { marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  transports: { flexWrap: 'wrap', marginBottom: 8 },
  list: { maxHeight: 360 },
  device: { paddingVertical: 12, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
