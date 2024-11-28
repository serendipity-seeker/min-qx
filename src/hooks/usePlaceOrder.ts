import createQXOrderPayload from '@/utils/createQXOrderPayload';
import ISSUER from '@/utils/issuer';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { useCallback, useState } from 'react';
import useFetchLatestTick from './useFectchlatestTick';
import { TICK_OFFSET } from '@/constants';
import createQXOrderTx from '@/utils/createQXOrderTx';
import broadcastTx from '@/utils/broadcastTx';
import { walletAtom } from '@/store/wallet';
import { useAtom } from 'jotai';

const usePlaceOrder = () => {
  const [orderTick, setOrderTick] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [wallet] = useAtom(walletAtom);
  const { latestTick, fetchLatestTick } = useFetchLatestTick();

  const placeOrder = useCallback(
    async (asset: string, type: 'buy' | 'sell' | 'rmBuy' | 'rmSell', price: number, amount: number): Promise<void> => {
      const latestTick = await fetchLatestTick();
      setOrderTick(latestTick + TICK_OFFSET);
      setShowProgress(true);

      const orderPayload = createQXOrderPayload(ISSUER.get(asset) || '', asset, price, amount);

      const actionType = {
        buy: QubicDefinitions.QX_ADD_BID_ORDER,
        sell: QubicDefinitions.QX_ADD_ASK_ORDER,
        rmBuy: QubicDefinitions.QX_REMOVE_BID_ORDER,
        rmSell: QubicDefinitions.QX_REMOVE_ASK_ORDER,
      }[type];

      const transaction = await createQXOrderTx(wallet.id, wallet.seed, latestTick + TICK_OFFSET, orderPayload, actionType);

      const res = await broadcastTx(transaction);
      const data = await res.json();
      if (data.code > 0) setShowProgress(false);
      console.log(data);
    },
    [fetchLatestTick, setOrderTick, setShowProgress, createQXOrderPayload, broadcastTx]
  );

  return { orderTick, showProgress, setShowProgress, placeOrder };
};

export default usePlaceOrder;
