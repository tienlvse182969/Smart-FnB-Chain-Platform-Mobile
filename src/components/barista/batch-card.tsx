import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// Image của React Native, không dùng expo-image — xem lý do ở MenuItemCard (blur của AppModal).
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

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

/** Số dòng hiện sẵn trên thẻ; phần còn lại bấm "+N phần nữa" để mở. */
const MAX_VISIBLE_CUPS = 4;

function BigButton({
  label,
  icon,
  active,
  onPress,
  flex,
  small,
  loading,
  disabled,
}: {
  label: string;
  icon?: 'play' | 'check' | 'done';
  active?: boolean;
  onPress: () => void;
  flex?: boolean;
  /** nút gọn trên từng dòng ly — chừa chỗ cho chữ tuỳ chọn khi thẻ hẹp */
  small?: boolean;
  /** đang gửi thao tác của chính nút này → vòng quay thay icon (nút gọn: thay chữ) */
  loading?: boolean;
  /** đang có thao tác khác chạy → khoá và làm mờ */
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const bg = active ? theme.brand_primary : theme.fill_base;
  const fg = active ? theme.brand_on_primary : theme.color_text_base;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.bigBtn,
        small && styles.smallBtn,
        flex && { flexGrow: 1 },
        { backgroundColor: bg, borderColor: theme.border_color_base },
        disabled && !loading && styles.btnDisabled,
        pressed && { opacity: 0.7 },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon name={icon} size={19} color={fg} />
      ) : null}
      {loading && small ? null : <Txt style={[styles.bigBtnText, { color: fg }]}>{label}</Txt>}
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
  image,
  now,
  onStart,
  onFinish,
  busy,
  disabled,
}: {
  batch: Batch;
  /** ảnh minh hoạ món (lấy từ menu theo menuItemId); thiếu thì hiện ô thay thế */
  image?: string;
  now: number;
  onStart: (lineIds: string[]) => void;
  /** `part`: 'all' = Xong tất cả, hoặc id dòng ly khi bấm Xong từng ly — để hiện vòng quay đúng nút */
  onFinish: (lineIds: string[], part: string) => void;
  /** nút đang xử lý trong thẻ này: 'start' | 'all' | id dòng ly */
  busy?: string | null;
  /** đang có thao tác khác chạy trên màn hình → khoá các nút */
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const level = LEVEL_COLOR[waitLevelOf(batch.oldestPaidAt, now)];
  const lineIds = batch.entries.map((e) => e.line.id);
  const started = batch.state === 'started';
  // Giới hạn số dòng ly để các thẻ trong grid không chênh chiều cao quá nhiều.
  const hiddenCount = expanded ? 0 : Math.max(0, batch.entries.length - MAX_VISIBLE_CUPS);
  const visibleEntries = hiddenCount > 0 ? batch.entries.slice(0, MAX_VISIBLE_CUPS) : batch.entries;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.fill_base,
          borderColor: level?.border ?? theme.border_color_thin,
          borderWidth: level ? 2 : StyleSheet.hairlineWidth,
        },
      ]}>
      {level ? <View style={[styles.levelStrip, { backgroundColor: level.border }]} /> : null}
      {/* Ảnh nhỏ bên trái để nhận món nhanh; tên món chiếm phần còn lại, số ly + thời gian chờ
          nằm dòng dưới để không lẹm tên. */}
      <View style={styles.headRow}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={[styles.thumb, { backgroundColor: theme.fill_body }]}
            resizeMode="cover"
            // Ảnh menu là ảnh gốc upload (tới 5MB): giải nén theo kích thước ô thay vì full-size.
            resizeMethod="resize"
            fadeDuration={150}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.fill_body }]}>
            <Icon name="brand" size={24} color={theme.color_text_caption} strokeWidth={1.4} />
          </View>
        )}
        <View style={styles.head}>
          <Txt style={styles.name} numberOfLines={2}>
            {batch.name}
            {batch.sizeLabel ? ` · ${batch.sizeLabel}` : ''}
          </Txt>
          <View style={styles.metaRow}>
            <Txt style={styles.meta} muted numberOfLines={1}>
              {t('baristaQueue.cupCount', { count: batch.cupCount })}
              {started ? ` · ${t('baristaQueue.inProgress')}` : ''}
            </Txt>
            <View style={[styles.waitBadge, level ? { backgroundColor: level.bg } : null]}>
              <Txt style={[styles.wait, level ? { color: level.border } : null]} numberOfLines={1}>
                {t('baristaQueue.waited', { duration: durationSince(batch.oldestPaidAt) })}
              </Txt>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.cups, { borderColor: theme.border_color_thin }]}>
        {visibleEntries.map((e) => {
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
                <BigButton
                  small
                  label={t('baristaQueue.finishCup')}
                  loading={busy === e.line.id}
                  disabled={disabled}
                  onPress={() => onFinish([e.line.id], e.line.id)}
                />
              ) : null}
            </View>
          );
        })}
        {batch.entries.length > MAX_VISIBLE_CUPS ? (
          <Pressable
            hitSlop={6}
            onPress={() => setExpanded((v) => !v)}
            style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}>
            <Txt style={[styles.moreText, { color: theme.color_text_base }]}>
              {hiddenCount > 0
                ? t('baristaQueue.showMoreCups', { count: hiddenCount })
                : t('baristaQueue.showLessCups')}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.btnRow}>
        {started ? (
          <BigButton
            label={t('baristaQueue.finishBatch')}
            icon="done"
            active
            flex
            loading={busy === 'all'}
            disabled={disabled}
            onPress={() => onFinish(lineIds, 'all')}
          />
        ) : (
          <BigButton
            label={t('baristaQueue.startBatch')}
            icon="play"
            active
            flex
            loading={busy === 'start'}
            disabled={disabled}
            onPress={() => onStart(lineIds)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // flexGrow: giãn bằng thẻ cao nhất cùng hàng trong lưới; nút bấm luôn nằm đáy thẻ (btnRow marginTop auto)
  card: { flexGrow: 1, borderRadius: 6, padding: 14, gap: 10, overflow: 'hidden' },
  levelStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  head: { flex: 1, gap: 4 },
  name: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexShrink: 1, fontSize: 14 },
  waitBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  wait: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 18 },
  moreBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreText: { fontFamily: fontFamily.bold, fontSize: 13, textDecorationLine: 'underline' },
  cups: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  cupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  callChip: {
    minWidth: 52,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  callNumber: { fontFamily: fontFamily.black, fontSize: 16, lineHeight: 22 },
  cupInfo: { flex: 1, gap: 2 },
  cupText: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 20 },
  cupDefault: { fontFamily: fontFamily.regular, opacity: 0.55 },
  note: { fontFamily: fontFamily.bold, fontSize: 13 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 'auto' },
  bigBtn: {
    minHeight: 48,
    minWidth: 80,
    borderWidth: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  smallBtn: { minWidth: 60, paddingHorizontal: 10 },
  btnDisabled: { opacity: 0.45 },
  bigBtnText: { fontFamily: fontFamily.bold, fontSize: 15 },
});
