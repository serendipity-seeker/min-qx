interface Order {
  entityId: string;
  price: number;
  numberOfShares: number;
}

interface OwnedAsset {
  data: {
    issuedAsset: {
      name: string;
    };
    numberOfUnits: number;
  };
}

interface Balance {
  id: string;
  balance: string;
  validForTick: number;
  latestIncomingTransferTick: number;
  latestOutgoingTransferTick: number;
  incomingAmount: string;
  outgoingAmount: string;
  numberOfIncomingTransfers: number;
  numberOfOutgoingTransfers: number;
}

interface ThemeMode {
  mode: 'light' | 'dark';
}

export type { Order, OwnedAsset, Balance, ThemeMode };
