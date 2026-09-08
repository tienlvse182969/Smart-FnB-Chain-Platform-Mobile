import { Toast } from '@ant-design/react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClaimCard } from '@/src/components/claim-card';
import { EmptyState } from '@/src/components/empty-state';
import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function ReadyScreen() {
  const theme = useAppTheme();
  const { claimQueue, unclaimedCount, claimItem, serveItem, kitchenTick } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Món chờ bưng"
          subtitle="Bếp báo xong — nhận việc rồi bưng lên bàn (WT-04, W05)"
          right={
            <>
              <View style={[styles.chip, { borderColor: theme.border_color_base }]}>
                <Icon name="bell" size={12} color={theme.color_text_caption} />
                <Txt variant="tiny" muted>
                  {unclaimedCount}/{claimQueue.length} chưa nhận
                </Txt>
              </View>
              <Btn
                label="Giả lập bếp"
                icon="stove"
                size="sm"
                variant="ghost"
                onPress={() => {
                  kitchenTick();
                  Toast.info('Giả lập bếp: đẩy 1 món tiến 1 bước.', 1.2);
                }}
              />
            </>
          }
        />

        {claimQueue.length === 0 ? (
          <EmptyState
            icon="bellOff"
            title="Chưa có món chờ bưng"
            hint="Khi bếp báo Xong, hệ thống bắn món ra đây theo chế độ ra món của từng danh mục."
          />
        ) : (
          <FlatList
            data={claimQueue}
            keyExtractor={(c) => c.key}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ClaimCard
                entry={item}
                onClaim={() => {
                  claimItem(item.itemId);
                  Toast.info(`Bạn đã nhận bưng ${item.name} · ${item.tableName}.`, 1.4);
                }}
                onServe={() => {
                  serveItem(item.itemId);
                  Toast.success(`${item.tableName} · ${item.name} → đã phục vụ.`, 1.4);
                }}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 24 },
});
