export type DealQueryKey =
  | "dealsByDate"
  | "dealsByIsTopDealAndUpdatedAt"
  | "dealsByIsLightningDealAndUpdatedAt";

export type ModelSortDirection = "ASC" | "DESC";

export const DEFAULT_SORT_DIRECTION: ModelSortDirection = "ASC";

export interface Deal {
  id: string;
  short_code: string;
  store_sku: string;
  title: string;
  title_lowercase: string;
  description: string;
  description_lowercase: string;
  price_drop: number;
  deal_link: string;
  affiliate_link: string;
  img_link: string;
  has_promotional_code: boolean;
  promotional_code: string | null;
  has_amazon_subscribe_save: boolean;
  amazon_subscribe_save: string | null;
  has_coupon: boolean;
  coupon: string | null;
  expiration_date: string;
  poster_id: string;
  poster_name: string;
  forum_type: string;
  forum_type_lowercase: string;
  sub_category: string;
  sub_category_lowercase: string;
  dealer_type: string;
  dealer_type_lowercase: string;
  instore: boolean;
  dealType: string;
  dealDayType: string;
  isTopDeal: string;
  isTrendingDeal: string;
  isLightningDeal: string;
  specific_states: boolean;
  available_states: string[];
  specific_stores: boolean;
  available_store_addresses: string[];
  available_store_zipcodes: string[];
  available_store_geohashes: string[];
  available_store_placeID: string | null;
  vote: number;
  price: number;
  expired: boolean;
  expired_status_string: string;
  expired_ttl: number | null;
  poster_img_url: string;
  prev_price: number;
  uploaded_img_links: string[];
  free_shipping: boolean;
  free_pickup: boolean;
  down_vote: number;
  posted_date: string;
  updated_date: string;
  ExpiredVotedNumber: number;
  ExpiredVotedNumberAccumulated: number;
  ReportedNumber: number;
  ReportedNumberAccumulated: number;
  highest_votes: number;
  highest_ratio: number;
  createdAt: string;
  updatedAt: string;
  owner: string;
  search_by_time: string;
  search_by_vote: string;
  additionalTitles: string[];
  additionalLinks: string[];
  _version: number;
  _deleted: boolean | null;
  _lastChangedAt: number;
  __typename: "Deal";
}

export interface ModelDealConnection {
  items: Deal[];
  nextToken: string | null;
  startedAt: null;
  __typename: "ModelDealConnection";
}

export interface DealsQueryVariables {
  limit?: number;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection;
}

export interface DealsByDateVariables extends DealsQueryVariables {
  search_by_time: string;
}

export interface DealsByIsTopDealAndUpdatedAtVariables extends DealsQueryVariables {
  isTopDeal: string;
}

export interface DealsByIsLightningDealAndUpdatedAtVariables extends DealsQueryVariables {
  isLightningDeal: string;
}

export interface DealsByDateResponse {
  data: {
    dealsByDate: ModelDealConnection;
  };
}

export interface DealsByIsTopDealAndUpdatedAtResponse {
  data: {
    dealsByIsTopDealAndUpdatedAt: ModelDealConnection;
  };
}

export interface DealsByIsLightningDealAndUpdatedAtResponse {
  data: {
    dealsByIsLightningDealAndUpdatedAt: ModelDealConnection;
  };
}
