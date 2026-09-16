import { Switch } from '@ant-design/react-native';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Pill } from '@/src/components/ui/pill';
import { Txt } from '@/src/components/ui/txt';
import { clockAt, durationSince } from '@/src/data/format';
import { categories, shiftInfo, staffByRole } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

export default function KitchenShiftScreen() {
  const theme = useAppTheme();
  const { state, checkOut, setSimulate, setKitchenStationCategories } = useStore();
  const selectedCats = state.kitchenStationCategories;

  const toggleCat = (id: string) =>
    setKitchenStationCategories(
      selectedCats.includes(id) ? selectedCats.filter((x) => x !== id) : [...selectedCats, id],
    );

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader
          title="Ca làm việc"
          subtitle={`${staffByRole['Bếp'].name} · ${staffByRole['Bếp'].role}`}
        />

        <View style={cardStyle}>
          <View style={styles.shiftHead}>
            <Icon name="done" size={22} />
            <Txt style={styles.big}>{state.checkedInAt ? 'Đang trong ca' : 'Chưa check-in'}</Txt>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border_color_thin }]} />
          <Row label="Chi nhánh" value={shiftInfo.branch} />
          <Row label="Giờ check-in" value={state.checkedInAt ? clockAt(state.checkedInAt) : '—'} />
          <Row label="Thời lượng" value={state.checkedInAt ? durationSince(state.checkedInAt) : '—'} />
          <Txt variant="caption" muted style={styles.checkoutNote}>
            Thực tế: Quản lý chi nhánh sẽ check-out cho bạn khi hết ca. Nút dưới đây chỉ để đổi
            vai trò khi mô phỏng.
          </Txt>
          <Btn
            label="Check-out ca (demo)"
            icon="logout"
            block
            variant="ghost"
            style={styles.checkout}
            onPress={() => {
              checkOut();
              router.replace('/login');
            }}
          />
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          Danh mục phụ trách
        </Txt>
        <View style={cardStyle}>
          <View style={styles.catRow}>
            {categories.map((c) => (
              <Pill key={c.id} label={c.label} selected={selectedCats.includes(c.id)} onPress={() => toggleCat(c.id)} />
            ))}
          </View>
          <Txt variant="caption" muted style={styles.catHint}>
            Dùng làm bộ lọc mặc định ở Hàng đợi — vẫn đổi được ở đó.
          </Txt>
        </View>

        <Txt variant="bodyStrong" muted style={styles.sectionTitle}>
          Cài đặt
        </Txt>
        <View style={cardStyle}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Txt variant="body">Mô phỏng real-time</Txt>
              <Txt variant="tiny" muted>
                Tự đẩy order mới nhận qua các trạng thái để xem hiệu ứng cập nhật.
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
  pad: { padding: 20, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, padding: 16, gap: 6, marginBottom: 8 },
  shiftHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  big: { fontFamily: fontFamily.bold, fontSize: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  checkoutNote: { marginTop: 10 },
  checkout: { marginTop: 10 },
  sectionTitle: { marginTop: 12, marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catHint: { marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { flex: 1, gap: 2 },
});
