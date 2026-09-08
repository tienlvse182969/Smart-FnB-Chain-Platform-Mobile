import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { ReservationRow } from '@/src/components/reservation-row';
import { ScreenHeader } from '@/src/components/screen-header';
import { Txt } from '@/src/components/ui/txt';
import { clockAt } from '@/src/data/format';
import { useStore } from '@/src/data/store';

export default function ReservationsScreen() {
  const { state } = useStore();

  const list = useMemo(
    () =>
      [...state.reservations].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      ),
    [state.reservations],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Đặt trước sắp tới"
          subtitle={`${list.length} lượt · ${clockAt(new Date().toISOString())}`}
        />
        <Txt variant="caption" muted style={styles.note}>
          Danh sách chỉ xem — khách quét QR bàn khi tới, phục vụ mở phiên ở màn Sơ đồ bàn.
        </Txt>

        {list.length === 0 ? (
          <EmptyState icon="reservations" title="Không có đặt trước" />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <ReservationRow reservation={item} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  note: { marginBottom: 8 },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 24 },
});
