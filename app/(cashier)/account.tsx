import { AccountScreen } from '@/src/components/account-screen';
import { CustomerDisplayCard } from '@/src/components/pos/customer-display-card';
import { PrinterCard } from '@/src/components/pos/printer-card';

export default function CashierAccountScreen() {
  return (
    <AccountScreen role="Thu ngân">
      <CustomerDisplayCard />
      <PrinterCard />
    </AccountScreen>
  );
}
