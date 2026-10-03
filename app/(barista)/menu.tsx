import { Switch, Toast } from '@ant-design/react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/src/components/screen-header';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import { setMenuItemAvailability as updateItem, setMenuOptionAvailability as updateOption } from '@/src/services/barista-api';
import { loadBaristaMenu } from '@/src/services/cashier-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

/**
 * Báo hết món hoặc hết một tuỳ chọn như topping (BA-03, mục 6.6). Tắt là quầy thu ngân không
 * bán được ngay; dòng đã trả tiền chứa món đó chuyển Hết món và báo Quản lý (BR-36).
 */
export default function BaristaMenuScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { state, isMenuAvailable, isOptionAvailable, setMenuAvailability, setOptionAvailability, replaceMenu } =
    useStore();
  const [workingId, setWorkingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const menu = await loadBaristaMenu();
      replaceMenu(menu.menu, menu.categories);
    } catch (reason) {
      Toast.fail(reason instanceof Error ? reason.message : 'Không thể tải danh sách món', 2, undefined, false);
    }
  }, [replaceMenu]);

  // màn hình tự tải menu mỗi lần được focus, không dựa vào việc hàng đợi đã tải trước
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const changeItem = async (id: string, available: boolean) => {
    setWorkingId(id);
    try {
      await updateItem(id, available);
      setMenuAvailability(id, available);
      await reload();
    } catch (reason) {
      Toast.fail(reason instanceof Error ? reason.message : 'Không thể cập nhật món', 2, undefined, false);
    } finally {
      setWorkingId(null);
    }
  };

  const changeOption = async (id: string, available: boolean) => {
    setWorkingId(id);
    try {
      await updateOption(id, available);
      setOptionAvailability(id, available);
      await reload();
    } catch (reason) {
      Toast.fail(reason instanceof Error ? reason.message : 'Không thể cập nhật tùy chọn', 2, undefined, false);
    } finally {
      setWorkingId(null);
    }
  };

  // tuỳ chọn không bắt buộc (topping, thêm…) mới có thể hết — size/đường/đá luôn sẵn
  const optionChoices = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; group: string }>();
    for (const item of state.menu) {
      for (const g of item.options) {
        if (g.required) continue;
        for (const c of g.choices) if (!seen.has(c.id)) seen.set(c.id, { id: c.id, label: c.label, group: g.label });
      }
    }
    return [...seen.values()];
  }, [state.menu]);

  const rowStyle = [styles.row, { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title={t('baristaMenu.title')} subtitle={t('baristaMenu.subtitle')} />

        <Txt variant="bodyStrong" muted style={styles.section}>
          {t('baristaMenu.optionsSection')}
        </Txt>
        <View style={styles.list}>
          {optionChoices.map((c) => (
            <View key={c.id} style={rowStyle}>
              <View style={styles.info}>
                <Txt style={styles.name} numberOfLines={1}>
                  {c.label}
                </Txt>
                <Txt variant="title" muted>
                  {c.group}
                </Txt>
              </View>
              <Switch disabled={workingId !== null} checked={isOptionAvailable(c.id)} onChange={(v) => void changeOption(c.id, v)} />
            </View>
          ))}
        </View>

        <Txt variant="bodyStrong" muted style={styles.section}>
          {t('baristaMenu.itemsSection')}
        </Txt>
        <View style={styles.list}>
          {state.menu.map((item) => (
            <View key={item.id} style={rowStyle}>
              <View style={styles.info}>
                <Txt style={styles.name} numberOfLines={1}>
                  {item.name}
                </Txt>
                <Txt variant="title" muted>
                  {state.categories.find((c) => c.id === item.categoryId)?.label}
                </Txt>
              </View>
              <Switch disabled={workingId !== null} checked={isMenuAvailable(item.id)} onChange={(v) => void changeItem(item.id, v)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  section: { marginTop: 8, marginBottom: 8 },
  list: { gap: 10 },
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
});
