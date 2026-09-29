import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { waitLevelOf } from '@/src/data/batching';
import { durationSince } from '@/src/data/format';
import { customOptions } from '@/src/data/order-utils';
import { SIZE_GROUP_ID, type Batch } from '@/src/data/types';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Icon } from '../ui/icon';
import { Txt } from '../ui/txt';

/** Màu ngữ nghĩa cố định — không đổi theo màu thương hiệu (BR-42). */
const LEVEL_COLOR = {
  'bình thường': undefined,
  'sắp trễ': { bg: '#FFF3D6', border: '#B7791F' },
  trễ: { bg: '#FBDBD8', border: '#C0392B' },
} as const;

function BigButton({
  label,
  icon,
  active,
  onPress,
  flex,
}: {
  label: string;
  icon?: 'play' | 'check' | 'done';
  active?: boolean;
  onPress: () => void;
  flex?: boolean;
}) {
  const theme = useAppTheme();
  const bg = active ? theme.brand_primary : theme.fill_base;
  const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigBtn,
        flex && { flexGrow: 1 },
        { backgroundColor: bg, borderColor: theme.border_color_base },
        pressed && { opacity: 0.7 },
      ]}>
      {icon ? <Icon name={icon} size={22} color={fg} /> : null}
      <Txt style={[styles.bigBtnText, { color: fg }]}>{label}</Txt>
    </Pressable>
  );
}

/**
 * Một mẻ trong hàng đợi pha chế (BA-01, BA-02). Chưa bắt đầu: nút "Bắt đầu mẻ". Đã bắt đầu:
 * "Xong" từng ly hoặc cả mẻ. Chỉ tuỳ chọn khác mặc định được in đậm; ghi chú nổi bật (mục 4.7).
 * Không còn tên bàn — loại hình trả trước theo số gọi.
 */
export function BatchCard({
  batch,
  now,
  onStart,
  onFinish,
}: {
  batch: Batch;
  now: number;
  onStart: (lineIds: string[]) => void;
  onFinish: (lineIds: string[]) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const level = LEVEL_COLOR[waitLevelOf(batch.oldestPaidAt, now)];
  const lineIds = batch.entries.map((e) => e.line.id);
  const started = batch.state === 'started';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: level?.bg ?? theme.fill_base,
          borderColor: level?.border ?? theme.border_color_thin,
          borderWidth: level ? 2 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.headRow}>
        <View style={styles.headTitle}>
          <Txt style={styles.name} numberOfLines={2}>
            {batch.name}
            {batch.sizeLabel ? ` · ${batch.sizeLabel}` : ''}
          </Txt>
          <Txt variant="title" muted>
            {t('baristaQueue.cupCount', { count: batch.cupCount })}
            {started ? ` · ${t('baristaQueue.inProgress')}` : ''}
          </Txt>
        </View>
        <Txt style={[styles.wait, level ? { color: level.border } : null]}>
          {t('baristaQueue.waited', { duration: durationSince(batch.oldestPaidAt) })}
        </Txt>
      </View>

      <View style={[styles.cups, { borderColor: theme.border_color_thin }]}>
        {batch.entries.map((e) => {
          const extras = customOptions(e.line.options).filter((o) => o.groupId !== SIZE_GROUP_ID);
          return (
            <View key={e.line.id} style={styles.cupRow}>
              <View style={[styles.callChip, { borderColor: theme.border_color_base }]}>
                <Txt style={styles.callNumber}>{String(e.callNumber).padStart(3, '0')}</Txt>
              </View>
              <View style={styles.cupInfo}>
                <Txt style={[styles.cupText, extras.length === 0 && styles.cupDefault]}>
                  {e.line.qty > 1 ? `×${e.line.qty}  ` : ''}
                  {extras.length ? extras.map((o) => o.label).join(' · ') : t('baristaQueue.defaultOptions')}
                </Txt>
                {e.line.note ? (
                  <Txt style={styles.note} numberOfLines={2}>
                    ✎ {e.line.note}
                  </Txt>
                ) : null}
              </View>
              {started ? (
                <BigButton label={t('baristaQueue.finishCup')} icon="check" onPress={() => onFinish([e.line.id])} />
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.btnRow}>
        {started ? (
          <BigButton
            label={t('baristaQueue.finishBatch')}
            icon="done"
            active
            flex
            onPress={() => onFinish(lineIds)}
          />
        ) : (
          <BigButton label={t('baristaQueue.startBatch')} icon="play" active flex onPress={() => onStart(lineIds)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 6, padding: 14, gap: 10 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headTitle: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30 },
  wait: { fontFamily: fontFamily.bold, fontSize: 20 },
  cups: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  cupRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  callChip: {
    minWidth: 68,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  callNumber: { fontFamily: fontFamily.black, fontSize: 22, lineHeight: 28 },
  cupInfo: { flex: 1, gap: 2 },
  cupText: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  cupDefault: { fontFamily: fontFamily.regular, opacity: 0.55 },
  note: { fontFamily: fontFamily.bold, fontSize: 18 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bigBtn: {
    minHeight: 64,
    minWidth: 96,
    borderWidth: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  bigBtnText: { fontFamily: fontFamily.bold, fontSize: 20 },
});
