import {
  Armchair,
  ArrowLeft,
  ArrowLeftRight,
  Ban,
  BellOff,
  BellRing,
  BookmarkCheck,
  CalendarClock,
  Check,
  CheckCheck,
  ChefHat,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  Clock,
  CookingPot,
  LayoutGrid,
  LayoutList,
  Link2,
  ListFilter,
  Loader,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Minus,
  Moon,
  Pencil,
  Plus,
  Receipt,
  ReceiptText,
  RefreshCw,
  Rows3,
  Send,
  Sun,
  Timer,
  Trash2,
  User,
  UserRoundCheck,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/use-theme';

export const Icons = {
  grid: LayoutGrid,
  reservations: CalendarClock,
  bell: BellRing,
  bellOff: BellOff,
  shift: Clock,
  brand: UtensilsCrossed,
  available: CircleDashed,
  reserved: BookmarkCheck,
  occupied: Users,
  payment: ReceiptText,
  cleaning: Utensils,
  back: ArrowLeft,
  moveTable: ArrowLeftRight,
  stove: CookingPot,
  guestArrived: UserRoundCheck,
  plus: Plus,
  minus: Minus,
  edit: Pencil,
  remove: Trash2,
  lock: Lock,
  pin: MapPin,
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
  chair: Armchair,
  done: CircleCheck,
  receipt: Receipt,
  chefHat: ChefHat,
  merge: Link2,
  filter: ListFilter,
  itemView: Rows3,
  ticketView: LayoutList,
  timer: Timer,
  close: X,
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
