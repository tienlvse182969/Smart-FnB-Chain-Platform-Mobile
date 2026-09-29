import {
  ArrowLeft,
  Ban,
  Banknote,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  ChefHat,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock,
  CupSoda,
  LayoutGrid,
  ListFilter,
  Loader,
  Languages,
  Lock,
  LogIn,
  LogOut,
  Minus,
  Moon,
  PackageCheck,
  Pencil,
  Play,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sun,
  Timer,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';

export const Icons = {
  grid: LayoutGrid,
  pos: ShoppingBag,
  orders: ReceiptText,
  bell: BellRing,
  bellOff: BellOff,
  shift: Clock,
  brand: UtensilsCrossed,
  payment: ReceiptText,
  back: ArrowLeft,
  plus: Plus,
  minus: Minus,
  edit: Pencil,
  remove: Trash2,
  lock: Lock,
  send: Send,
  served: CheckCheck,
  check: Check,
  preparing: Loader,
  unavailable: Ban,
  refresh: RefreshCw,
  login: LogIn,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  user: User,
  users: Users,
  chevronDown: ChevronDown,
  done: CircleCheck,
  receipt: Receipt,
  chefHat: ChefHat,
  filter: ListFilter,
  timer: Timer,
  close: X,
  language: Languages,
  cash: Banknote,
  qr: QrCode,
  print: Printer,
  drink: CupSoda,
  ready: PackageCheck,
  play: Play,
  search: Search,
  clear: CircleX,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof Icons;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const theme = useAppTheme();
  const Cmp = Icons[name];
  return <Cmp size={size} color={color ?? theme.color_text_base} strokeWidth={strokeWidth} />;
}

export function IconButton({
  name,
  onPress,
  size = 20,
  color,
  disabled,
  variant = 'plain',
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  variant?: 'plain' | 'outlined' | 'filled';
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  const tint =
    variant === 'filled' ? theme.color_text_base_inverse : color ?? theme.color_text_base;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        variant === 'outlined' && { borderWidth: 1, borderColor: theme.border_color_base },
        variant === 'filled' && { backgroundColor: theme.brand_primary },
        pressed && { opacity: 0.55 },
        disabled && { opacity: 0.3 },
        style,
      ]}>
      <Icon name={name} size={size} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
