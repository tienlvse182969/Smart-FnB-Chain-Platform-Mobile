import { Stepper as AntdStepper } from '@ant-design/react-native';
import type { StepperStyle } from '@ant-design/react-native/lib/stepper/style';

import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'md' | 'sm';
}) {
  const theme = useAppTheme();
  const s = size === 'sm' ? 30 : 36;

  const styles: Partial<StepperStyle> = {
    container: { width: size === 'sm' ? 96 : 116 },
    stepWrap: {
      flex: 0,
      width: s,
      height: s,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border_color_base,
      backgroundColor: 'transparent',
    },
    stepText: { fontSize: size === 'sm' ? 15 : 17, color: theme.color_text_base },
    stepDisabled: { opacity: 0.3, borderColor: theme.border_color_thin },
    disabledStepTextColor: { color: theme.color_text_disabled },
  };

  return (
    <AntdStepper
      value={value}
      min={min}
      max={max}
      editable={false}
      styles={styles}
      inputStyle={{
        fontFamily: fontFamily.regular,
        fontSize: size === 'sm' ? 15 : 17,
        color: theme.color_text_base,
      }}
      onChange={(v) => onChange(v ?? min)}
    />
  );
}
