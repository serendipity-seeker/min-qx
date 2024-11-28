import { Button, FormControl, InputLabel, MenuItem, Select, TextField, IconButton, SelectChangeEvent } from '@mui/material';
import OrderTable from '@/components/OrderTable';
import { LinearProgress, Box } from '@mui/material';
import { Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Circle as CircleIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalance as AccountBalanceWalletIcon,
  ShoppingCart as ShoppingCartIcon,
  Sell as SellIcon,
  Token as TokenIcon,
} from '@mui/icons-material';
import { useAtom } from 'jotai';
import { walletAtom } from '@/store/wallet';
import themeAtom from '@/store/theme';
import ISSUER from '@/utils/issuer';
import usePlaceOrder from '@/hooks/usePlaceOrder';
import useFetchAssetsOrders from '@/hooks/useFetchAssetsOrders';
import useBalance from '@/hooks/useBalance';
import useFetchLatestTick from '@/hooks/useFectchlatestTick';
import useOwnedAssets from '@/hooks/useOwnedAssets';
import { POLLING_INTERVAL } from '@/constants';
import { useNavigate } from 'react-router-dom';

const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
  const newValue = event.target.value;
  if (/^\d*$/.test(newValue)) {
    setter(newValue);
  }
};

const Home: React.FC = () => {
  const [wallet] = useAtom(walletAtom);
  const [themeMode, setThemeMode] = useAtom(themeAtom);
  const [id, setId] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');
  const [price, setPrice] = useState<string>('0');
  const [log, setLog] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (!wallet.id) {
      navigate('/login');
    }
  }, [wallet.id]);

  const tabLabels = useMemo(() => [...ISSUER.keys()], []);

  const { orderTick, showProgress, placeOrder } = usePlaceOrder();
  const { askOrders, bidOrders, fetchOrders } = useFetchAssetsOrders();
  const { balance, fetchBalance } = useBalance();
  const { latestTick, fetchLatestTick } = useFetchLatestTick();
  const { assets, fetchOwnedAssets } = useOwnedAssets();

  console.log('Order Tick', orderTick);
  console.log('Latest Tick', latestTick);
  console.log('Show Progress', showProgress);
  console.log('Tab Index', tabIndex);
  console.log('Tab Labels', tabLabels);
  console.log('Ask Orders', askOrders);
  console.log('Bid Orders', bidOrders);
  console.log('Balance', balance);
  console.log('Assets', assets);

  const changeAsset = useCallback(
    async (event: SelectChangeEvent<number>) => {
      const newIndex = Number(event.target.value);
      setTabIndex(newIndex);
      fetchOrders(tabLabels[newIndex], ISSUER.get(tabLabels[newIndex]) || 'QX');
    },
    [tabLabels, fetchOrders]
  );

  useEffect(() => {
    Promise.all([fetchBalance(id), fetchOwnedAssets(id), fetchLatestTick(), fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX')]);
  }, [id, tabIndex, tabLabels, fetchBalance, fetchOrders]);

  useEffect(() => {
    if (!id) return;

    const intervalId = setInterval(async () => {
      await Promise.all([fetchBalance(id), fetchOwnedAssets(id), fetchLatestTick()]);

      if (showProgress && latestTick >= orderTick) {
        await fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX');
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [id, showProgress, orderTick, tabIndex, tabLabels, fetchBalance, fetchOrders]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircleIcon sx={{ color: wallet.id ? 'success.main' : 'error.main' }} />
          {wallet.id ? `ID: ${wallet.id}` : 'No ID Connected'}
        </Typography>
        <IconButton onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}>{themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}</IconButton>
      </Box>

      {wallet.id && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccountBalanceWalletIcon />
            Balance: {balance.balance} qus
          </Typography>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TokenIcon />
            {tabLabels[tabIndex]}: {assets.get(tabLabels[tabIndex]) || 0} assets
          </Typography>
        </Box>
      )}

      <Box>
        <Button variant="outlined" onClick={() => setId('')} sx={{ mb: 3 }}>
          Logout
        </Button>

        <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
          <InputLabel>Token</InputLabel>
          <Select value={tabIndex} onChange={changeAsset} label="Token" sx={{ maxWidth: 200 }}>
            {tabLabels.map((label, index) => (
              <MenuItem value={index} key={index}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField label="Amount" value={amount} onChange={handleInputChange(setAmount)} variant="outlined" size="small" sx={{ width: 150 }} />
          <TextField label="Price" value={price} onChange={handleInputChange(setPrice)} variant="outlined" size="small" sx={{ width: 150 }} />
          <Button variant="contained" startIcon={<ShoppingCartIcon />} onClick={() => placeOrder(tabLabels[tabIndex], 'buy', Number(price), Number(amount))}>
            Buy {tabLabels[tabIndex]}
          </Button>
          <Button variant="contained" color="secondary" startIcon={<SellIcon />} onClick={() => placeOrder(tabLabels[tabIndex], 'sell', Number(price), Number(amount))}>
            Sell {tabLabels[tabIndex]}
          </Button>
        </Box>

        {showProgress && <LinearProgress sx={{ mb: 2 }} />}

        <Typography variant="body2" sx={{ mb: 1 }}>
          Last Action: {showProgress && log}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Latest Tick: {latestTick}
        </Typography>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Ask Orders
        </Typography>
        <OrderTable orders={askOrders} type="Ask" id={id} tabLabels={tabLabels} tabIndex={tabIndex} placeOrder={placeOrder} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Bid Orders
        </Typography>
        <OrderTable orders={bidOrders} type="Bid" id={id} tabLabels={tabLabels} tabIndex={tabIndex} placeOrder={placeOrder} />
      </Box>
    </Box>
  );
};

export default Home;
