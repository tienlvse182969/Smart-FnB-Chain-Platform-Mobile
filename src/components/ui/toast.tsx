import { Toast } from '@ant-design/react-native';
import { Text } from 'react-native';

import { Icons } from '@/src/components/ui/icon';
import { fontFamily } from '@/src/theme/typography';

// Toast của antd mặc định dùng font-icon riêng; ở đây thay bằng icon lucide + HarmonyOS Sans cho đồng bộ với app.
type Kind = 'success' | 'fail' | 'info';

const KIND_ICON = {
  success: Icons.done,
  fail: Icons.clear,
  info: Icons.info,
} as const;

function show(kind: Kind) {
  return (content: string, duration?: number, onClose?: () => void, mask?: boolean) => {
    const Cmp = KIND_ICON[kind];
    return Toast.info(
      {
        content: (
          <Text style={{ color: '#fff', fontFamily: fontFamily.medium, fontSize: 14, textAlign: 'center' }}>
            {content}
          </Text>
        ),
        icon: <Cmp size={36} color="#fff" strokeWidth={2} />,
      },
      duration,
      onClose,
      mask,
    );
  };
}

export const toast = {
  success: show('success'),
  fail: show('fail'),
  info: show('info'),
};
