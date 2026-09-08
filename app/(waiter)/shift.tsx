import { Switch } from '@ant-design/react-native';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, durationSince } from '@/src/data/format';
import { shiftInfo, staff } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function ShiftScreen() {
  const theme = useAppTheme();
  const { state, checkOut, setSimulate } = useStore();

  const myTables = state.tables.filter((t) => t.status === 'Đang phục vụ');
  const sessionOf = (tableId: string) =>
    state.sessions.find((s) => s.tableId === tableId && s.status === 'Đang hoạt động');

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title="Ca làm việc" subtitle={`${staff.name} · ${staff.role}`} />

        <View style={cardStyle}>
          <View style={styles.shiftHead}>
            <Icon name="done" size={20} />
            <Txt variant="title">{state.checkedInAt ? 'Đang trong ca' : 'Chưa check-in'}</Txt>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
          <Row label="Chi nhánh" value={shiftInfo.branch} />
          <Row label="Khu phụ trách" value={shiftInfo.zone} />
          <Row label="Giờ check-in" value={state.checkedInAt ? clockAt(state.checkedInAt) : '—'} />
          <Row label="Thời lượng" value={state.checkedInAt ? durationSince(state.checkedInAt) : '—'} />
          <Row label="Phiên đang phục vụ" value={`${myTables.length} bàn`} />
          <Btn
            label="Check-out ca"
            icon="logout"
            block
            style={styles.checkout}
            onPress={() => {
              checkOut();
              router.replace('/login');
            }}
          />
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          Bàn đang phụ trách
        </Txt>
        <View style={[...cardStyle, styles.cardTight]}>
          {myTables.length === 0 ? (
            <Txt variant="body" muted style={styles.rowPad}>
              Chưa phục vụ bàn nào
            </Txt>
          ) : null}
          {myTables.map((t, i) => {
            const s = sessionOf(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() =>
                  router.push({ pathname: '/(waiter)/table/[id]', params: { id: t.id } })
                }
                style={({ pressed }) => [
                  styles.tableRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border_color_thin,
                  },
                  pressed && { backgroundColor: theme.fill_tap },
                ]}>
                <Icon name="chair" size={18} color={theme.color_text_caption} />
                <View style={styles.tableRowText}>
                  <Txt variant="bodyStrong">
                    {t.name} · {t.area}
                  </Txt>
                  {s ? (
                    <Txt variant="caption" muted>
                      {s.guests} khách · {s.orders.length} order · {durationSince(s.openedAt)}
                    </Txt>
                  ) : null}
                </View>
                <Icon name="chevronDown" size={16} color={theme.color_text_caption} />
              </Pressable>
            );
          })}
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          Cài đặt
        </Txt>
        <View style={cardStyle}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Txt variant="body">Mô phỏng real-time</Txt>
              <Txt variant="tiny" muted>
                Tự đẩy trạng thái món mỗi vài giây để xem hiệu ứng cập nhật.
              </Txt>
            </View>
            <Switch checked={state.simulate} onChange={setSimulate} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt variant="body" muted>
        {label}
      </Txt>
      <Txt variant="body">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: 16, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 2, padding: 16, gap: 6, marginBottom: 8 },
  cardTight: { padding: 0, paddingVertical: 4 },
  shiftHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  checkout: { marginTop: 14 },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  rowPad: { padding: 14 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  tableRowText: { flex: 1, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { flex: 1, gap: 2 },
});
