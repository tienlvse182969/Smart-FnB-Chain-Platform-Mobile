import { Toast } from '@ant-design/react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegendBar } from '@/src/components/legend-bar';
import { ScreenHeader } from '@/src/components/screen-header';
import { TableCard } from '@/src/components/table-card';
import { AppModal } from '@/src/components/ui/app-modal';
import { Icon, IconButton } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Stepper } from '@/src/components/ui/stepper';
import { Txt } from '@/src/components/ui/txt';
import { clockAt } from '@/src/data/format';
import { shiftInfo } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { Table, TableArea } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';

const AREAS: (TableArea | 'Tất cả')[] = ['Tất cả', 'Tầng 1', 'Sân vườn', 'VIP'];

export default function FloorScreen() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const { state, sessionByTable, openSession, markCleaned } = useStore();

  const [area, setArea] = useState<(typeof AREAS)[number]>('Tất cả');
  const [dialog, setDialog] = useState<{ table: Table; mode: 'open' | 'clean' } | null>(null);
  const [guests, setGuests] = useState(2);

  const railWidth = width < 820 ? 68 : 116;
  const numColumns = Math.max(2, Math.min(5, Math.floor((width - railWidth - 32) / 210)));

  const data = useMemo(
    () => state.tables.filter((t) => area === 'Tất cả' || t.area === area),
    [state.tables, area],
  );

  const goSession = (tableId: string) =>
    router.push({ pathname: '/(waiter)/table/[id]', params: { id: tableId } });

  const onTablePress = (table: Table) => {
    if (table.status === 'Đang phục vụ') return goSession(table.id);
    if (table.status === 'Cần dọn') return setDialog({ table, mode: 'clean' });
    // Trống hoặc Đã đặt trước → mở phiên
    setGuests(table.reservedFor?.partySize ?? 2);
    setDialog({ table, mode: 'open' });
  };

  const confirmOpen = () => {
    if (!dialog) return;
    openSession(dialog.table.id, guests);
    Toast.info(`Đã kích hoạt mã QR bàn ${dialog.table.name}.`, 1.6);
    const id = dialog.table.id;
    setDialog(null);
    goSession(id);
  };

  const confirmClean = () => {
    if (!dialog) return;
    markCleaned(dialog.table.id);
    setDialog(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Sơ đồ bàn"
          subtitle={`${shiftInfo.branch} · khu ${shiftInfo.zone}`}
          right={
            <>
              <View style={[styles.rtChip, { borderColor: theme.border_color_base }]}>
                <Icon
                  name={state.simulate ? 'done' : 'unavailable'}
                  size={12}
                  color={theme.color_text_caption}
                />
                <Txt variant="tiny" muted>
                  {state.simulate ? 'Real-time: bật' : 'Real-time: tắt'}
                </Txt>
              </View>
              <IconButton
                name="refresh"
                variant="outlined"
                onPress={() => Toast.info('Đã tải lại trạng thái bàn mới nhất.', 1.5)}
              />
            </>
          }
        />

        <View style={styles.filterRow}>
          {AREAS.map((a) => (
            <Pill key={a} label={a} selected={area === a} onPress={() => setArea(a)} />
          ))}
        </View>

        <LegendBar />

        <FlatList
          key={numColumns}
          data={data}
          numColumns={numColumns}
          keyExtractor={(t) => t.id}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / numColumns }}>
              <TableCard
                table={item}
                session={sessionByTable(item.id)}
                onPress={() => onTablePress(item)}
              />
            </View>
          )}
        />
      </View>

      <AppModal
        visible={dialog?.mode === 'open'}
        title={`Mở phiên bàn ${dialog?.table.name ?? ''}`}
        onClose={() => setDialog(null)}
        maxWidth={400}
        actions={[
          { text: 'Huỷ', onPress: () => setDialog(null) },
          { text: 'Mở phiên & kích hoạt QR', primary: true, onPress: confirmOpen },
        ]}>
        <Txt variant="body" muted>
          {dialog?.table.reservedFor
            ? `Khách đặt trước lúc ${clockAt(dialog.table.reservedFor.time)}. `
            : ''}
          Mở phiên sẽ kích hoạt mã QR dán trên bàn để khách tự gọi món (WT-03).
        </Txt>
        <View style={styles.guestRow}>
          <Txt variant="bodyStrong">Số khách</Txt>
          <Stepper value={guests} onChange={setGuests} />
        </View>
      </AppModal>

      <AppModal
        visible={dialog?.mode === 'clean'}
        title={`Bàn ${dialog?.table.name ?? ''} cần dọn`}
        onClose={() => setDialog(null)}
        maxWidth={360}
        actions={[
          { text: 'Chưa xong', onPress: () => setDialog(null) },
          { text: 'Đã dọn xong', primary: true, onPress: confirmClean },
        ]}>
        <Txt variant="body" muted>
          Xác nhận bàn đã dọn sạch, chuyển về trạng thái Trống.
        </Txt>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  rtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  grid: { paddingVertical: 12, gap: 12 },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
