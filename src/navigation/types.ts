import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CoinMethod } from '../api/coins';
import { PostType, TeamMember, TeamMemberRole } from '../types/models';

export type TabParamList = {
  Home: undefined;
  /** `at`: when it was asked for, so asking for the same tab again still
   *  switches to it after the seller picked another one. */
  Orders: { filter?: string; at?: number } | undefined;
  AddPostTab: undefined;
  Products: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  NoShop: undefined;
  /** Right after login, when the account has several shops and none is chosen. */
  SelectShop: undefined;
  /** Switching shop later, from Home / More. A different route from SelectShop:
   *  sharing one name across the two auth stages kept the picker on screen
   *  after a shop was chosen. */
  ChooseShop: undefined;
  /** Creating a shop on Fazl: for an account with none, or another one.
   *  `paidFor`: the top-up just paid on AddCoins for another shop's fee. */
  CreateShop: { paidFor?: string } | undefined;
  /** Money into the owner's Fazl wallet, e.g. for another shop's fee: the amount
   *  missing (`needed`, rupees), or the whole fee paid with `method` right now
   *  (`shopFee`, rupees), after which Create shop sends the shop on. */
  AddCoins: { needed?: number; shopFee?: number; method?: CoinMethod } | undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  OrderDetail: { orderId: string };
  AssignRider: { orderId: string };
  /** A ready order going out with the shop delivering it: who takes it. */
  SelfDelivery: { orderId: string };
  CourierForm: { orderId: string };
  ProductForm: { productId?: string } | undefined;
  Inventory: { filter?: 'low' | 'out' } | undefined;
  AddPost: { type?: PostType } | undefined;
  Posts: undefined;
  /** A video played full screen: a posted one's URL, or a picked file's. */
  VideoPlayer: { uri: string; title?: string };
  Ads: undefined;
  CampaignForm: { campaignId?: string } | undefined;
  CampaignDetail: { campaignId: string };
  Pricing: undefined;
  Earnings: undefined;
  /** Earnings > Withdraw: the balance, accounts and requests (owner only). */
  Payouts: undefined;
  Withdraw: undefined;
  PayoutAccountForm: undefined;
  LocalDelivery: undefined;
  Shipping: undefined;
  Returns: undefined;
  BusinessProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
  /** The owner's team (owner only). */
  Team: undefined;
  /** Inviting someone (no member; `role` to start from), or changing an existing member. */
  TeamMemberForm: { member?: TeamMember; role?: TeamMemberRole } | undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
