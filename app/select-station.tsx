import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { Btn } from '@/src/components/ui/button';
import { Txt } from '@/src/components/ui/txt';
import { useStation } from '@/src/stations/station-context';
import { useAppTheme } from '@/src/theme/use-theme';

export default function SelectStationScreen() {
  const theme = useAppTheme();
  const { user, loading: authLoading, logout } = useAuth();
  const { stations, selectedStation, loading, error, refresh, selectStation } = useStation();

  if (authLoading) return null;
  if (user?.role !== 'CASHIER') return <Redirect href="/login" />;

  const openStation = async (station: (typeof stations)[number]) => {
    await selectStation(station);
    router.replace('/(cashier)/pos');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Txt variant="title">Chọn quầy làm việc</Txt>
            <Txt variant="body" muted>Mỗi ca thu ngân phải gắn với đúng quầy và máy in hóa đơn.</Txt>
          </View>
          <Btn label="Đăng xuất" onPress={() => void logout()} />
        </View>
        {loading ? <ActivityIndicator color={theme.brand_primary} /> : null}
        {error ? (
          <View style={[styles.notice, { backgroundColor: theme.fill_base, borderColor: theme.brand_error }]}>
            <Txt color={theme.brand_error}>{error}</Txt>
            <Btn label="Thử lại" onPress={() => void refresh()} />
          </View>
        ) : null}
        {!loading && !error && stations.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }]}>
            <Txt variant="h2">Chưa có quầy hoạt động</Txt>
            <Txt muted>Quản lý cần tạo và kích hoạt quầy trước khi bắt đầu bán hàng.</Txt>
            <Btn label="Tải lại" onPress={() => void refresh()} />
          </View>
        ) : null}
        <View style={styles.grid}>
          {stations.map((station) => (
            <Pressable
              key={station.id}
              accessibilityRole="button"
              onPress={() => void openStation(station)}
              style={({ pressed }) => [styles.station, {
                backgroundColor: theme.fill_base,
                borderColor: selectedStation?.id === station.id ? theme.brand_primary : theme.border_color_thin,
                opacity: pressed ? 0.75 : 1,
              }]}>
              <Txt variant="h2">{station.name}</Txt>
              <Txt variant="caption" muted>
                {station.printerConnection !== 'NONE' ? `Máy in: ${station.printerConnection}` : 'Chưa cấu hình máy in'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 32, gap: 24 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  headingText: { flex: 1, gap: 6 },
  notice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 20, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  station: { width: 260, minHeight: 130, borderWidth: 2, borderRadius: 8, padding: 20, gap: 8 },
});
