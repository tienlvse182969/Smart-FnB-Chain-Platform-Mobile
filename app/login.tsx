import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { staff } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useAppTheme } from '@/src/theme/use-theme';

const BRANCHES = ['Chi nhánh Q1 · Nguyễn Huệ', 'Chi nhánh Q3 · Võ Văn Tần', 'Chi nhánh Thủ Đức'];

export default function LoginScreen() {
  const theme = useAppTheme();
  const { checkIn } = useStore();

  const [email, setEmail] = useState('tien@smartfnb.vn');
  const [pin, setPin] = useState('');
  const [branchIdx, setBranchIdx] = useState(0);

  const submit = () => {
    checkIn();
    router.replace('/(waiter)/floor');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.fill_body }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.fill_base, borderColor: theme.border_color_thin },
          ]}>
          <View style={styles.brand}>
            <Icon name="brand" size={30} />
            <Txt variant="h1">Smart F&B</Txt>
          </View>
          <Txt variant="body" muted style={styles.subtitle}>
            Ứng dụng Phục vụ · check-in ca tại chi nhánh
          </Txt>

          <Field
            label="Email nhân viên"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            left={<Icon name="user" size={16} color={theme.color_text_caption} />}
          />
          <Field
            label="Mã PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            left={<Icon name="lock" size={16} color={theme.color_text_caption} />}
          />

          <View>
            <Txt variant="label" muted style={styles.fieldLabel}>
              Chi nhánh
            </Txt>
            <View style={styles.branchRow}>
              {BRANCHES.map((b, i) => (
                <Pressable
                  key={b}
                  onPress={() => setBranchIdx(i)}
                  style={[
                    styles.branch,
                    {
                      borderColor:
                        i === branchIdx ? theme.brand_primary : theme.border_color_base,
                      backgroundColor: i === branchIdx ? theme.brand_primary : 'transparent',
                    },
                  ]}>
                  <Txt
                    variant="caption"
                    color={
                      i === branchIdx ? theme.color_text_base_inverse : theme.color_text_base
                    }>
                    {b}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>

          <Btn label="Đăng nhập & Check-in ca" icon="login" block onPress={submit} style={styles.cta} />
          <Txt variant="tiny" muted style={styles.hint}>
            Bản phác thảo — bấm để vào thẳng, chưa nối hệ thống thật.
          </Txt>
        </View>
        <Txt variant="tiny" muted>
          {staff.name} · {staff.role}
        </Txt>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 8 },
  fieldLabel: { marginBottom: 6 },
  branchRow: { gap: 6 },
  branch: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 9 },
  cta: { marginTop: 8 },
  hint: { textAlign: 'center' },
});
