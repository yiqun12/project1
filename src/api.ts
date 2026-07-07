import { paginateDeals } from "./pagination.js";
import type {
  DealsByDateResponse,
  DealsByDateVariables,
  DealsByIsLightningDealAndUpdatedAtResponse,
  DealsByIsLightningDealAndUpdatedAtVariables,
  DealsByIsTopDealAndUpdatedAtResponse,
  DealsByIsTopDealAndUpdatedAtVariables,
} from "./types.js";

export function dealsByDate(
  variables: DealsByDateVariables
): DealsByDateResponse {
  return {
    data: {
      dealsByDate: paginateDeals("dealsByDate", {
        limit: variables.limit,
        nextToken: variables.nextToken,
        sortDirection: variables.sortDirection,
      }),
    },
  };
}

export function dealsByIsTopDealAndUpdatedAt(
  variables: DealsByIsTopDealAndUpdatedAtVariables
): DealsByIsTopDealAndUpdatedAtResponse {
  return {
    data: {
      dealsByIsTopDealAndUpdatedAt: paginateDeals("dealsByIsTopDealAndUpdatedAt", {
        limit: variables.limit,
        nextToken: variables.nextToken,
        sortDirection: variables.sortDirection,
      }),
    },
  };
}

export function dealsByIsLightningDealAndUpdatedAt(
  variables: DealsByIsLightningDealAndUpdatedAtVariables
): DealsByIsLightningDealAndUpdatedAtResponse {
  return {
    data: {
      dealsByIsLightningDealAndUpdatedAt: paginateDeals(
        "dealsByIsLightningDealAndUpdatedAt",
        {
          limit: variables.limit,
          nextToken: variables.nextToken,
          sortDirection: variables.sortDirection,
        }
      ),
    },
  };
}
