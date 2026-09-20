import { Toast } from '@ant-design/react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
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
import { tableAreaKey } from '@/src/i18n/labels';
import { useAppTheme } from '@/src/theme/use-theme';

const AREAS: (TableArea | 'Tất cả')[] = ['Tất cả', 'Tầng 1', 'Sân vườn', 'VIP'];

/** WinJS showPanel/hidePanel (Windows 8.1): 550ms, đường cong giảm tốc mũ, trượt thuần không fade. */
const PANEL_MOTION = { duration: 550, easing: Easing.bezier(0.1, 0.9, 0.2, 1) };

export default function FloorScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, sessionByTable, openSession } = useStore();

  const areaLabel = (a: (typeof AREAS)[number]) => (a === 'Tất cả' ? t('status.area.all') : t(tableAreaKey[a]));

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
  }, [openId]);

  // Chỉ trượt sau khi panel đã mount + vẽ xong, nếu không lần render đầu nuốt mất frame đầu của slide.
  useEffect(() => {
    if (!openId && !panelId) return;
    if (openId && panelId !== openId) return;
    const frame = requestAnimationFrame(() => {
      Animated.timing(panelAnim, {
        toValue: openId ? 1 : 0,
        ...PANEL_MOTION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !openId) setPanelId(null);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [openId, panelId, panelAnim]);

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
