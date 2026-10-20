import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Segmented } from '@/src/components/ui/segmented';
import { toast } from '@/src/components/ui/toast';
import { Txt } from '@/src/components/ui/txt';
import {
  clearPrinterConfig,
  listPairedPrinters,
  loadPrinterConfig,
  savePrinterConfig,
  toPrintFailure,
  type PairedPrinter,
  type PrinterConfig,
  type PrintFailure,
  type PrintMode,
} from '@/src/services/printer/bluetooth-printer';
import { printTestPage } from '@/src/services/printer/print-service';
import { useAppTheme } from '@/src/theme/use-theme';
import { PrintErrorDialog } from './print-error-dialog';

/** Mục "Máy in hóa đơn" trong Tài khoản của thu ngân: chọn máy in Bluetooth đã ghép đôi, chọn kiểu chữ, in thử. */
export function PrinterCard() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devices, setDevices] = useState<PairedPrinter[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [testFailure, setTestFailure] = useState<PrintFailure | null>(null);

  useEffect(() => {
    void loadPrinterConfig().then(setConfig);
  }, []);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setDevices(null);
    try {
      setDevices(await listPairedPrinters());
    } catch (failure) {
      setPickerOpen(false);
      toast.fail(failure instanceof Error ? failure.message : t('printer.loadFailed'), 3, undefined, false);
    }
  }, [t]);

  const choose = async (device: PairedPrinter) => {
    const next: PrinterConfig = { address: device.address, name: device.name, printMode: config?.printMode ?? 'image' };
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
              {config ? config.address : t('printer.noneHint')}
            </Txt>
          </View>
        </View>

        <Btn
          label={config ? t('printer.change') : t('printer.choose')}
          icon="print"
          variant={config ? 'ghost' : 'primary'}
          block
          onPress={() => void openPicker()}
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
        <ScrollView style={styles.list}>
          {devices === null ? (
            <Txt muted>…</Txt>
          ) : devices.length === 0 ? (
            <Txt variant="caption" muted>
              {t('printer.pickEmpty')}
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
                <Txt variant="tiny" muted>
                  {device.address}
                </Txt>
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
  list: { maxHeight: 360 },
  device: { paddingVertical: 12, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
