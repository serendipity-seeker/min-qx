import { Button, FormControl, InputLabel, MenuItem, Select, TextField, IconButton, SelectChangeEvent, Paper, Container, Grid, Divider, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
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
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean; type: 'buy' | 'sell'} | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!wallet.id || !wallet.seed || wallet.id === '' || wallet.seed === '') {
      navigate('/login');
    }
  }, [wallet.id, wallet.seed, navigate]);

  const tabLabels = useMemo(() => [...ISSUER.keys()], []);

  const { orderTick, showProgress, setShowProgress, placeOrder } = usePlaceOrder();
  const { askOrders, bidOrders, fetchOrders } = useFetchAssetsOrders();
  const { balance, fetchBalance } = useBalance();
  const { latestTick, fetchLatestTick } = useFetchLatestTick();
  const { assets, fetchOwnedAssets } = useOwnedAssets();

  const handleError = useCallback((err: Error) => {
    console.error(err);
    setError(err.message || 'An unexpected error occurred');
    setIsLoading(false);
  }, []);

  const changeAsset = useCallback(
    async (event: SelectChangeEvent<number>) => {
      try {
        setIsLoading(true);
        const newIndex = Number(event.target.value);
        setTabIndex(newIndex);
        await fetchOrders(tabLabels[newIndex], ISSUER.get(tabLabels[newIndex]) || 'QX');
      } catch (err) {
        handleError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [tabLabels, fetchOrders, handleError]
  );

  const handlePlaceOrder = useCallback(
    async (type: 'buy' | 'sell') => {
      try {
        if (!Number(amount) || !Number(price)) {
          throw new Error('Amount and price must be greater than 0');
        }

        if (type === 'buy' && Number(price) * Number(amount) > Number(balance?.balance || 0)) {
          throw new Error('Insufficient balance for this order');
        }

        if (type === 'sell' && Number(amount) > Number(assets.get(tabLabels[tabIndex]) || 0)) {
          throw new Error('Insufficient assets for this order');
        }

        setIsLoading(true);
        await placeOrder(tabLabels[tabIndex], type, Number(price), Number(amount));
        setLog(`${type.toUpperCase()} order placed successfully`);
        setConfirmDialog(null);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [amount, price, balance, assets, tabLabels, tabIndex, placeOrder, handleError]
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!wallet.id || wallet.id === '' || wallet.seed === '') return;

      try {
        setIsLoading(true);
        await Promise.all([fetchBalance(wallet.id), fetchOwnedAssets(wallet.id), fetchLatestTick(), fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX')]);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [wallet.id, wallet.seed, tabIndex, tabLabels, fetchBalance, fetchOwnedAssets, fetchLatestTick, fetchOrders, handleError]);

  useEffect(() => {
    if (!wallet.id || wallet.id === '' || wallet.seed === '') return;

    const intervalId = setInterval(async () => {
      try {
        const [, , latestTick] = await Promise.all([
          fetchBalance(wallet.id),
          fetchOwnedAssets(wallet.id),
          fetchLatestTick(),
          fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX'),
        ]);

        if (showProgress && latestTick >= orderTick) {
          await fetchOrders(tabLabels[tabIndex], ISSUER.get(tabLabels[tabIndex]) || 'QX');
        }

        setShowProgress(latestTick < orderTick);
      } catch (err) {
        handleError(err as Error);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [wallet.id, wallet.seed, showProgress, orderTick, tabIndex, tabLabels, fetchBalance, fetchOrders, handleError]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Dialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
      >
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmDialog?.type} {amount} {tabLabels[tabIndex]} at {price} qus each?
            {confirmDialog?.type === 'buy' && (
              <Typography color="primary" sx={{ mt: 2 }}>
                Total cost: {Number(amount) * Number(price)} qus
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>Cancel</Button>
          <Button 
            onClick={() => confirmDialog && handlePlaceOrder(confirmDialog.type)} 
            variant="contained" 
            color={confirmDialog?.type === 'buy' ? 'primary' : 'secondary'}
          >
            Confirm {confirmDialog?.type}
          </Button>
        </DialogActions>
      </Dialog>

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
          <Select value={tabIndex} onChange={changeAsset} label="Token" disabled={isLoading}>
            {tabLabels.map((label, index) => (
              <MenuItem value={index} key={index}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Amount"
              value={amount}
              onChange={handleInputChange(setAmount)}
              variant="outlined"
              disabled={isLoading}
              error={!Number(amount)}
              helperText={!Number(amount) ? 'Amount must be greater than 0' : ''}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Price"
              value={price}
              onChange={handleInputChange(setPrice)}
              variant="outlined"
              disabled={isLoading}
              error={!Number(price)}
              helperText={!Number(price) ? 'Price must be greater than 0' : ''}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ShoppingCartIcon />}
              onClick={() => setConfirmDialog({ open: true, type: 'buy' })}
              sx={{ height: '100%' }}
              disabled={isLoading || !Number(amount) || !Number(price)}
            >
              Buy {tabLabels[tabIndex]}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={<SellIcon />}
              onClick={() => setConfirmDialog({ open: true, type: 'sell' })}
              sx={{ height: '100%' }}
              disabled={isLoading || !Number(amount) || !Number(price)}
            >
              Sell {tabLabels[tabIndex]}
            </Button>
          </Grid>
        </Grid>

        {(showProgress || isLoading) && <LinearProgress sx={{ mb: 2 }} />}

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
