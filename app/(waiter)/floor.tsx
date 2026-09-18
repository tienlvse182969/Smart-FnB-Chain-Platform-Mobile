import { Toast } from '@ant-design/react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LegendBar } from '@/src/components/legend-bar';
import { ScreenHeader } from '@/src/components/screen-header';
import { SeatingDialog } from '@/src/components/seating-dialog';
import { TableCard } from '@/src/components/table-card';
import { TableDetailPanel } from '@/src/components/table-detail-panel';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
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
  const insets = useSafeAreaInsets();
  const { state, sessionByTable, openSession } = useStore();

  const [area, setArea] = useState<(typeof AREAS)[number]>('Tất cả');
  const [seating, setSeating] = useState<{ area?: TableArea } | null>(null);
  const [reservedDialog, setReservedDialog] = useState<Table | null>(null);
  const [lockedToast, setLockedToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  const railWidth = width < 820 ? 68 : 116;
  const numColumns = Math.max(2, Math.min(5, Math.floor((width - railWidth - 32) / 210)));
  const panelWidth = Math.min(440, Math.max(340, width - railWidth - 80));

  const data = useMemo(
    () => state.tables.filter((t) => area === 'Tất cả' || t.area === area),
    [state.tables, area],
  );

  useEffect(() => {
    if (openId) setPanelId(openId);
    Animated.timing(panelAnim, {
      toValue: openId ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !openId) setPanelId(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const goSession = (tableId: string) => setOpenId(tableId);

  const onTablePress = (table: Table) => {
    if (table.status === 'Đang phục vụ') return goSession(table.id);
    if (table.status === 'Tạm khoá') {
      setLockedToast(true);
      return;
    }
    if (table.status === 'Đã đặt trước') return setReservedDialog(table);
    setSeating({ area: table.area });
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Toast.info('Đã tải lại trạng thái bàn mới nhất.', 1.5);
    }, 600);
  };

  const confirmReserved = () => {
    if (!reservedDialog) return;
    openSession([reservedDialog.id], reservedDialog.reservedFor?.partySize ?? 2);
    Toast.info(`Đã kích hoạt QR bàn ${reservedDialog.name}.`, 1.6);
    const id = reservedDialog.id;
    setReservedDialog(null);
    goSession(id);
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
              <Btn label="Mở bàn mới" icon="plus" size="sm" onPress={() => setSeating({})} />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.color_text_base}
              colors={[theme.color_text_base]}
            />
          }
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

      <SeatingDialog
        visible={!!seating}
        tables={state.tables}
        defaultArea={seating?.area}
        onDismiss={() => setSeating(null)}
        onOpen={(tableIds, guests) => {
          openSession(tableIds, guests);
          setSeating(null);
          Toast.info(`Đã kích hoạt QR bàn ${tableIds.length > 1 ? 'ghép' : ''}.`, 1.6);
          goSession(tableIds[0]);
        }}
      />

      <AppModal
        visible={!!reservedDialog}
        title={`Bàn ${reservedDialog?.name ?? ''} — đã đặt trước`}
        onClose={() => setReservedDialog(null)}
        maxWidth={380}
        actions={[
          { text: 'Đóng', onPress: () => setReservedDialog(null) },
          { text: 'Khách đã đến — mở phiên', primary: true, onPress: confirmReserved },
        ]}>
        <Txt variant="body" muted>
          {reservedDialog?.reservedFor
            ? `${reservedDialog.reservedFor.name} · ${reservedDialog.reservedFor.partySize} khách · đặt lúc ${clockAt(reservedDialog.reservedFor.time)}`
            : ''}
        </Txt>
      </AppModal>

      <AppModal
        visible={lockedToast}
        title="Bàn tạm khoá"
        onClose={() => setLockedToast(false)}
        maxWidth={340}
        actions={[{ text: 'Đã hiểu', onPress: () => setLockedToast(false) }]}>
        <Txt variant="body" muted>
          Bàn đang tạm khoá (hỏng/bảo trì), không thể mở phiên. Liên hệ Branch Manager nếu cần mở
          lại.
        </Txt>
      </AppModal>

      {panelId ? (
        <Animated.View
          pointerEvents={openId ? 'auto' : 'none'}
          style={[
            styles.panelWrap,
            {
              width: panelWidth,
              top: insets.top,
              right: insets.right,
              bottom: insets.bottom,
              backgroundColor: theme.fill_body,
              borderLeftColor: theme.border_color_thin,
              transform: [
                {
                  translateX: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [panelWidth, 0],
                  }),
                },
              ],
            },
          ]}>
          <TableDetailPanel
            embedded
            id={panelId}
            onClose={() => setOpenId(null)}
            onNavigate={(toId) => setOpenId(toId)}
          />
        </Animated.View>
      ) : null}
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
  panelWrap: {
    position: 'absolute',
    borderLeftWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 8,
  },
});
