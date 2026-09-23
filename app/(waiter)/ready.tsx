import { Toast } from '@ant-design/react-native';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClaimCard } from '@/src/components/waiter/claim-card';
import { EmptyState } from '@/src/components/empty-state';
import { ScreenHeader } from '@/src/components/screen-header';
import { Btn } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import { useAppTheme } from '@/src/theme/use-theme';

export default function ReadyScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { claimQueue, unclaimedCount, claimItem, serveItem, kitchenTick } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={styles.pad}>
        <ScreenHeader
          title={t('ready.title')}
          subtitle={t('ready.subtitle')}
          right={
            <>
              <View style={[styles.chip, { borderColor: theme.border_color_base }]}>
                <Icon name="bell" size={12} color={theme.color_text_caption} />
                <Txt variant="tiny" muted>
                  {t('ready.unclaimed', { unclaimed: unclaimedCount, total: claimQueue.length })}
                </Txt>
              </View>
              <Btn
                label={t('ready.simulateKitchen')}
                icon="stove"
                size="sm"
                variant="ghost"
                onPress={() => {
                  kitchenTick();
                  Toast.info(t('ready.simulateToast'), 1.2);
                }}
              />
            </>
          }
        />

        {claimQueue.length === 0 ? (
          <EmptyState icon="bellOff" title={t('ready.emptyTitle')} hint={t('ready.emptyHint')} />
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
                  Toast.info(t('ready.claimedToast', { name: item.name, table: item.tableName }), 1.4);
                }}
                onServe={() => {
                  serveItem(item.itemId);
                  Toast.show(
                    {
                      content: t('ready.servedToast', { table: item.tableName, name: item.name }),
                      icon: (
                        <View style={styles.toastIcon}>
                          <Icon name="done" size={36} color={theme.color_text_base_inverse} />
                        </View>
                      ),
                    },
                    1.4,
                  );
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
  toastIcon: { marginBottom: 6 },
});
