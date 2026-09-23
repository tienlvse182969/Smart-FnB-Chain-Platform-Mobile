import { Toast } from '@ant-design/react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegendBar } from '@/src/components/waiter/legend-bar';
import { ScreenHeader } from '@/src/components/screen-header';
import { SeatingDialog } from '@/src/components/waiter/seating-dialog';
import { TableCard } from '@/src/components/waiter/table-card';
import { useTablePanel } from '@/src/components/waiter/table-panel-overlay';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { clockAt } from '@/src/data/format';
import { shiftInfo } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { Table, TableArea } from '@/src/data/types';
import { tableAreaKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

const AREAS: (TableArea | 'Tất cả')[] = ['Tất cả', 'Tầng 1', 'Sân vườn', 'VIP'];

export default function FloorScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { state, sessionByTable, openSession } = useStore();
  const { openTablePanel } = useTablePanel();

  const areaLabel = (a: (typeof AREAS)[number]) => (a === 'Tất cả' ? t('status.area.all') : t(tableAreaKey[a]));

  const [area, setArea] = useState<(typeof AREAS)[number]>('Tất cả');
  const [seating, setSeating] = useState<{ area?: TableArea } | null>(null);
  const [reservedDialog, setReservedDialog] = useState<Table | null>(null);
  const [lockedToast, setLockedToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const railWidth = width < 820 ? 68 : 116;
  const numColumns = Math.max(2, Math.min(5, Math.floor((width - railWidth - 32) / 210)));

  const data = useMemo(
    () => state.tables.filter((t) => area === 'Tất cả' || t.area === area),
    [state.tables, area],
  );

  const goSession = (tableId: string) => openTablePanel(tableId);

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
      Toast.info(t('floor.refreshToast'), 1.5);
    }, 600);
  };

  const confirmReserved = () => {
    if (!reservedDialog) return;
    openSession([reservedDialog.id], reservedDialog.reservedFor?.partySize ?? 2);
    Toast.info(t('floor.qrActivated', { name: reservedDialog.name }), 1.6);
    const id = reservedDialog.id;
    setReservedDialog(null);
    goSession(id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title={t('floor.title')}
          subtitle={t('floor.subtitle', { branch: shiftInfo.branch, zone: shiftInfo.zone })}
          right={
            <>
              <View style={[styles.rtChip, { borderColor: theme.border_color_base }]}>
                <Icon
                  name={state.simulate ? 'done' : 'unavailable'}
                  size={12}
                  color={theme.color_text_caption}
                />
                <Txt variant="tiny" muted>
                  {state.simulate ? t('floor.realtimeOn') : t('floor.realtimeOff')}
                </Txt>
              </View>
              <Btn label={t('floor.openTable')} icon="plus" size="sm" onPress={() => setSeating({})} />
            </>
          }
        />

        <View style={styles.filterRow}>
          {AREAS.map((a) => (
            <Pill key={a} label={areaLabel(a)} selected={area === a} onPress={() => setArea(a)} />
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
          Toast.info(
            tableIds.length > 1 ? t('floor.qrActivatedMerged') : t('floor.qrActivated', { name: '' }),
            1.6,
          );
          goSession(tableIds[0]);
        }}
      />

      <AppModal
        visible={!!reservedDialog}
        title={t('floor.reservedModalTitle', { name: reservedDialog?.name ?? '' })}
        icon="reserved"
        onClose={() => setReservedDialog(null)}
        maxWidth={380}
        actions={[
          { text: t('common.close'), onPress: () => setReservedDialog(null) },
          { text: t('floor.guestArrived'), primary: true, onPress: confirmReserved },
        ]}>
        <Txt variant="body" muted>
          {reservedDialog?.reservedFor
            ? t('floor.reservedInfo', {
                name: reservedDialog.reservedFor.name,
                party: reservedDialog.reservedFor.partySize,
                time: clockAt(reservedDialog.reservedFor.time),
              })
            : ''}
        </Txt>
      </AppModal>

      <AppModal
        visible={lockedToast}
        title={t('floor.lockedTitle')}
        icon="lock"
        onClose={() => setLockedToast(false)}
        maxWidth={340}
        actions={[{ text: t('common.gotIt'), onPress: () => setLockedToast(false) }]}>
        <Txt variant="body" muted>
          {t('floor.lockedBody')}
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
});
