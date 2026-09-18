import { Switch } from '@ant-design/react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Stepper } from '@/src/components/ui/stepper';
import { Txt } from '@/src/components/ui/txt';
import { categoryById, menu } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

export default function KitchenMenuScreen() {
  const theme = useAppTheme();
  const { isMenuAvailable, remainingPortionsOf, setMenuAvailability, setRemainingPortions } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader title="Món ăn" subtitle="Bật/tắt & cập nhật số suất còn lại (BR-06, BR-07)" />
        <FlatList
          data={menu}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const available = isMenuAvailable(item.id);
            const portions = remainingPortionsOf(item.id);
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
                ]}>
                <View style={styles.info}>
                  <Txt style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Txt>
                  <Txt variant="title" muted>
                    {categoryById[item.categoryId]?.label}
                  </Txt>
                </View>
                {portions !== undefined ? (
                  <View style={styles.portions}>
                    <Txt variant="label" muted>
                      Còn lại
                    </Txt>
                    <Stepper
                      value={portions}
                      min={0}
                      max={99}
                      onChange={(v) => setRemainingPortions(item.id, v)}
                    />
                  </View>
                ) : null}
                <Switch checked={available} onChange={(v) => setMenuAvailability(item.id, v)} />
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.bold, fontSize: 20 },
  portions: { alignItems: 'center', gap: 4 },
});
