import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostType } from '../types/models';

export type TabParamList = {
  Home: undefined;
  Orders: { filter?: string } | undefined;
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
  /** Creating a shop on Fazl: for an account with none, or another one. */
  CreateShop: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  OrderDetail: { orderId: string };
  AssignRider: { orderId: string };
  CourierForm: { orderId: string };
  ProductForm: { productId?: string } | undefined;
  Inventory: { filter?: 'low' | 'out' } | undefined;
  AddPost: { type?: PostType } | undefined;
  Posts: undefined;
  Ads: undefined;
  CampaignForm: { campaignId?: string } | undefined;
  CampaignDetail: { campaignId: string };
  Pricing: undefined;
  Earnings: undefined;
  LocalDelivery: undefined;
  Shipping: undefined;
  Returns: undefined;
  BusinessProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
