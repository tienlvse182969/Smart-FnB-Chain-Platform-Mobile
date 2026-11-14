import { AccountScreen } from '@/src/components/account-screen';
import { NewOrderSoundSetting } from '@/src/components/barista/new-order-sound-setting';

export default function BaristaAccountScreen() {
  return <AccountScreen role="Pha chế" settings={<NewOrderSoundSetting />} />;
}
