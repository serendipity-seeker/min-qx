import { useState, useCallback } from 'react';
import { Order } from '@/types';
import { API_URL } from '@/constants';

const useFetchAssetsOrders = () => {
  const [askOrders, setAskOrders] = useState<Order[]>([]);
  const [bidOrders, setBidOrders] = useState<Order[]>([]);

  const fetchAssetOrders = useCallback(async (assetName: string, issuerID: string, type: string, offset: number): Promise<Response> => {
    return await fetch(`${API_URL}/v1/qx/getAsset${type}Orders?assetName=${assetName}&issuerId=${issuerID}&offset=${offset}`, { method: 'GET' });
  }, []);

  const fetchOrders = useCallback(
    async (assetName: string, issuerID: string): Promise<void> => {
      try {
        const [askResponse, bidResponse] = await Promise.all([fetchAssetOrders(assetName, issuerID, 'Ask', 0), fetchAssetOrders(assetName, issuerID, 'Bid', 0)]);

        const askData = await askResponse.json();
        const bidData = await bidResponse.json();

        console.log("Ask Data", askData);
        console.log("Bid Data", bidData);

        setAskOrders(askData.orders);
        setBidOrders(bidData.orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    },
    [fetchAssetOrders]
  );

  return {
    askOrders,
    bidOrders,
    fetchOrders,
  };
};

export default useFetchAssetsOrders;
