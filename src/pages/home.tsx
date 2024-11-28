import { Button, FormControl, InputLabel, MenuItem, Select, TextField, IconButton, SelectChangeEvent, Paper, Container, Grid, Divider } from '@mui/material';
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
  Logout as LogoutIcon,
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
  const [wallet, setWallet] = useAtom(walletAtom);
  const [themeMode, setThemeMode] = useAtom(themeAtom);
  const [amount, setAmount] = useState<string>('0');
  const [price, setPrice] = useState<string>('0');
  const [log, setLog] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (!wallet.id || !wallet.seed || wallet.id === '' || wallet.seed === '') {
      navigate('/login');
    }
  }, [wallet.id]);

  const tabLabels = useMemo(() => [...ISSUER.keys()], []);

  const { orderTick, showProgress, setShowProgress, placeOrder } = usePlaceOrder();
  const { askOrders, bidOrders, fetchOrders } = useFetchAssetsOrders();
  const { balance, fetchBalance } = useBalance();
  const { latestTick, fetchLatestTick } = useFetchLatestTick();
  const { assets, fetchOwnedAssets } = useOwnedAssets();

  const changeAsset = useCallback(
    async (event: SelectChangeEvent<number>) => {
      const newIndex = Number(event.target.value);
      setTabIndex(newIndex);
      fetchOrders(tabLabels[newIndex], ISSUER.get(tabLabels[newIndex]) || 'QX');
    },
    [tabLabels, fetchOrders]
  );

  useEffect(() => {
    if (!wallet.id || wallet.id === '' || wallet.seed === '') return;
    Promise.all([fetchBalance(wallet.id), fetchOwnedAssets(wallet.id), fetchLatestTick(), fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX')]);
  }, [wallet.id, tabIndex, tabLabels, fetchBalance, fetchOrders]);

  useEffect(() => {
    if (!wallet.id || wallet.id === '' || wallet.seed === '') return;

    const intervalId = setInterval(async () => {
      await Promise.all([fetchBalance(wallet.id), fetchOwnedAssets(wallet.id), fetchLatestTick(), fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX')]);

      if (showProgress && latestTick >= orderTick) {
        await fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX');
      }

      setShowProgress(latestTick < orderTick);
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [wallet.id, showProgress, orderTick, tabIndex, tabLabels, fetchBalance, fetchOrders]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md="auto">
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircleIcon sx={{ color: wallet.id ? 'success.main' : 'error.main' }} />
              {wallet.id ? `ID: ${wallet.id.slice(0, 8)}...${wallet.id.slice(-8)}` : 'No ID Connected'}
            </Typography>
          </Grid>
          <Grid item xs={12} md="auto" sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => setWallet({ id: '', seed: '' })} color="error">
              Logout
            </Button>
            <IconButton onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Grid>
        </Grid>
      </Paper>

      {wallet.id && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon color="primary" />
                Balance:{' '}
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {balance?.balance || 0}
                </Box>{' '}
                qus
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TokenIcon color="secondary" />
                {tabLabels[tabIndex]}:{' '}
                <Box component="span" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                  {assets.get(tabLabels[tabIndex]) || 0}
                </Box>{' '}
                assets
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <FormControl sx={{ mb: 3, minWidth: 200 }}>
          <InputLabel>Token</InputLabel>
          <Select value={tabIndex} onChange={changeAsset} label="Token">
            {tabLabels.map((label, index) => (
              <MenuItem value={index} key={index}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Amount" value={amount} onChange={handleInputChange(setAmount)} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Price" value={price} onChange={handleInputChange(setPrice)} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button fullWidth variant="contained" startIcon={<ShoppingCartIcon />} onClick={() => placeOrder(tabLabels[tabIndex], 'buy', Number(price), Number(amount))} sx={{ height: '100%' }}>
              Buy {tabLabels[tabIndex]}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={<SellIcon />}
              onClick={() => placeOrder(tabLabels[tabIndex], 'sell', Number(price), Number(amount))}
              sx={{ height: '100%' }}
            >
              Sell {tabLabels[tabIndex]}
            </Button>
          </Grid>
        </Grid>

        {showProgress && <LinearProgress sx={{ mb: 2 }} />}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Last Action: {showProgress && log}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Latest Tick: {latestTick}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>
          Ask Orders
        </Typography>
        <OrderTable orders={askOrders} type="Ask" id={wallet.id} tabLabels={tabLabels} tabIndex={tabIndex} placeOrder={placeOrder} />

        <Typography variant="h6" sx={{ mt: 4, mb: 2, color: 'success.main' }}>
          Bid Orders
        </Typography>
        <OrderTable orders={bidOrders} type="Bid" id={wallet.id} tabLabels={tabLabels} tabIndex={tabIndex} placeOrder={placeOrder} />
      </Paper>
    </Container>
  );
};

export default Home;
