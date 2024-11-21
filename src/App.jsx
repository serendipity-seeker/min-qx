import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Divider,
  InputAdornment,
  IconButton,
  LinearProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  ListItemButton,
  ListItemIcon,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CircleIcon from '@mui/icons-material/Circle';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// QUBIC
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper.js';
import { QubicTransferQXOrderPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferQXOrderPayload.js';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction.js';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions.js';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey.js';
import { Long } from '@qubic-lib/qubic-ts-library/dist/qubic-types/Long.js';

const API_URL = 'https://api.qubic.org';
const BASE_URL = 'https://rpc.qubic.org';
const TICK_OFFSET = 5;
const POLLING_INTERVAL = 5000;

const ISSUER = new Map([
  ['QX', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['RANDOM', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['QUTIL', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['QTRY', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['MLM', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['QPOOL', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB'],
  ['QFT', 'TFUYVBXYIYBVTEMJHAJGEJOOZHJBQFVQLTBBKMEHPEVIZFXZRPEYFUWGTIWG'],
  ['CFB', 'CFBMEMZOIDEXQAUXYYSZIURADQLAPWPMNJXQSNVQZAHYVOPYUKKJBJUCTVJL'],
  ['QWALLET', 'QWALLETSGQVAGBHUCVVXWZXMBKQBPQQSHRYKZGEJWFVNUFCEDDPRMKTAUVHA'],
  ['QCAP', 'QCAPWMYRSHLBJHSTTZQVCIBARVOASKDENASAKNOBRGPFWWKRCUVUAXYEZVOG'],
]);

const App = () => {
  const [id, setId] = useState('');
  const [balance, setBalance] = useState(0);
  const [assets, setAssets] = useState(new Map());
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);
  const [seed, setSeed] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [latestTick, setLatestTick] = useState(0);
  const [log, setLog] = useState('');
  const [orderTick, setOrderTick] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [askOrders, setAskOrders] = useState([]);
  const [bidOrders, setBidOrders] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);

  const tabLabels = useMemo(() => [...ISSUER.keys()], []);

  const valueOfAssetName = useCallback((asset) => {
    const bytes = new Uint8Array(8);
    bytes.set(new TextEncoder().encode(asset));
    return new DataView(bytes.buffer).getBigInt64(0, true);
  }, []);

  const fetchAssetOrders = useCallback(async (assetName, issuerID, type, offset) => {
    return await fetch(`${API_URL}/v1/qx/getAsset${type}Orders?assetName=${assetName}&issuerId=${issuerID}&offset=${offset}`, { method: 'GET' });
  }, []);

  const createQXOrderPayload = useCallback(
    (issuer, assetName, price, numberOfShares) => {
      return new QubicTransferQXOrderPayload({
        issuer: new PublicKey(issuer),
        assetName: new Long(valueOfAssetName(assetName)),
        price: new Long(price),
        numberOfShares: new Long(numberOfShares),
      });
    },
    [valueOfAssetName]
  );

  const createQXOrderTransaction = useCallback(async (senderId, senderSeed, targetTick, payload, actionType) => {
    const transaction = new QubicTransaction()
      .setSourcePublicKey(new PublicKey(senderId))
      .setDestinationPublicKey(QubicDefinitions.QX_ADDRESS)
      .setTick(targetTick)
      .setInputSize(payload.getPackageSize())
      .setAmount(new Long(0))
      .setInputType(actionType)
      .setPayload(payload);

    switch (actionType) {
      case QubicDefinitions.QX_ADD_BID_ORDER:
        transaction.setAmount(new Long(payload.getTotalAmount()));
        break;
      case QubicDefinitions.QX_ADD_ASK_ORDER:
      case QubicDefinitions.QX_REMOVE_BID_ORDER:
      case QubicDefinitions.QX_REMOVE_ASK_ORDER:
        transaction.setAmount(new Long(0));
        break;
    }

    await transaction.build(senderSeed);
    return transaction;
  }, []);

  const broadcastTransaction = useCallback(async (transaction) => {
    const encodedTransaction = transaction.encodeTransactionToBase64(transaction.getPackageData());

    return await fetch(`${BASE_URL}/v1/broadcast-transaction`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ encodedTransaction }),
    });
  }, []);

  const qBalance = useCallback(
    async (ID) => {
      const response = await fetch(`${BASE_URL}/v1/balances/${ID || id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      return data['balance'];
    },
    [id]
  );

  const qFetchAssetOrders = useCallback(
    async (assetName, type) => {
      const response = await fetchAssetOrders(assetName, ISSUER.get(assetName), type, 0);
      const data = await response.json();
      return type === 'Ask' ? data['orders'].reverse() : data['orders'];
    },
    [fetchAssetOrders]
  );

  const qFetchLatestTick = useCallback(async () => {
    const response = await fetch(`${BASE_URL}/v1/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const data = await response.json();
    return data['lastProcessedTick']['tickNumber'];
  }, []);

  const qOwnedAssets = useCallback(
    async (ID) => {
      const response = await fetch(`${BASE_URL}/v1/assets/${ID || id}/owned`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      return data['ownedAssets'];
    },
    [id]
  );

  const qLogin = useCallback(async () => {
    const qubic = await new QubicHelper();
    const qubicPackage = await qubic.createIdPackage(seed);
    const newId = qubicPackage.publicId;

    setId(newId);
    const [balanceData, assetsData, tickData, askData, bidData] = await Promise.all([
      qBalance(newId),
      qOwnedAssets(newId),
      qFetchLatestTick(),
      qFetchAssetOrders(tabLabels[tabIndex], 'Ask'),
      qFetchAssetOrders(tabLabels[tabIndex], 'Bid'),
    ]);

    setBalance(balanceData.balance);
    setAssets(new Map(assetsData.map((el) => [el.data.issuedAsset.name, el.data.numberOfUnits])));
    setLatestTick(tickData);
    setAskOrders(askData);
    setBidOrders(bidData);
  }, [seed, tabIndex, tabLabels, qBalance, qOwnedAssets, qFetchLatestTick, qFetchAssetOrders]);

  const qOrder = useCallback(
    async (asset, type, rmPrice, rmAmount) => {
      const latestTick = await qFetchLatestTick();
      setOrderTick(latestTick + TICK_OFFSET);
      setShowProgress(true);

      const orderPayload = createQXOrderPayload(ISSUER.get(asset), asset, rmPrice || price, rmAmount || amount);

      const actionType = {
        buy: QubicDefinitions.QX_ADD_BID_ORDER,
        sell: QubicDefinitions.QX_ADD_ASK_ORDER,
        rmBuy: QubicDefinitions.QX_REMOVE_BID_ORDER,
        rmSell: QubicDefinitions.QX_REMOVE_ASK_ORDER,
      }[type];

      const transaction = await createQXOrderTransaction(id, seed, latestTick + TICK_OFFSET, orderPayload, actionType);

      await broadcastTransaction(transaction);

      setLog(`${type}: ${rmAmount || amount} asset(s) of ${asset} for ${rmPrice || price} qu per token on tick ${latestTick + TICK_OFFSET}`);
      return 'OK';
    },
    [id, seed, price, amount, createQXOrderPayload, createQXOrderTransaction, broadcastTransaction, qFetchLatestTick]
  );

  useEffect(() => {
    if (!id) return;

    const intervalId = setInterval(async () => {
      const [balanceData, assetsData, tick] = await Promise.all([qBalance(), qOwnedAssets(), qFetchLatestTick()]);

      setBalance(balanceData.balance);
      setAssets(new Map(assetsData.map((el) => [el.data.issuedAsset.name, el.data.numberOfUnits])));
      setLatestTick(tick);

      if (showProgress && tick >= orderTick) {
        const [askData, bidData] = await Promise.all([qFetchAssetOrders(tabLabels[tabIndex], 'Ask'), qFetchAssetOrders(tabLabels[tabIndex], 'Bid')]);
        setAskOrders(askData);
        setBidOrders(bidData);
      }
      setShowProgress(tick < orderTick);
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [id, showProgress, orderTick, tabIndex, tabLabels, qBalance, qOwnedAssets, qFetchLatestTick, qFetchAssetOrders]);

  const handleInputChange = useCallback(
    (setter) => (event) => {
      const newValue = event.target.value;
      if (/^\d*$/.test(newValue)) {
        setter(newValue);
      }
    },
    []
  );

  const changeAsset = useCallback(
    async (event) => {
      const newIndex = event.target.value;
      setTabIndex(newIndex);
      const [askData, bidData] = await Promise.all([qFetchAssetOrders(tabLabels[newIndex], 'Ask'), qFetchAssetOrders(tabLabels[newIndex], 'Bid')]);
      setAskOrders(askData);
      setBidOrders(bidData);
    },
    [tabLabels, qFetchAssetOrders]
  );

  const renderOrderList = useCallback(
    (orders, type) => (
      <Box sx={{ width: '100%', maxWidth: 900, bgcolor: 'background.paper' }}>
        <List sx={{ width: '100%', maxWidth: 900, bgcolor: 'background.paper' }}>
          {orders.map((item, index) => (
            <ListItem key={item.entityId + index} disablePadding>
              <ListItemButton role={undefined} dense>
                <ListItemIcon>{id === item.entityId && <DeleteIcon onClick={() => qOrder(tabLabels[tabIndex], type === 'Ask' ? 'rmSell' : 'rmBuy', item.price, item.numberOfShares)} />}</ListItemIcon>
                <ListItemText primary={item.price} />
                <ListItemText primary={item.numberOfShares} />
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      style={{
                        color: id === item.entityId ? '#4422FF' : 'FFFFFF',
                      }}
                    >
                      {item.entityId}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    ),
    [id, tabLabels, tabIndex, qOrder]
  );

  return (
    <>
      <Typography variant="h6" component="h4">
        <CircleIcon sx={{ color: id ? 'green' : 'red' }} />
        {id ? `ID: ${id}` : ' no ID connected'}
      </Typography>

      {id && (
        <>
          <Typography variant="h6" component="h4">
            BALANCE: {balance} qus
          </Typography>
          <Typography variant="h6" component="h4">
            {tabLabels[tabIndex]}: {assets.get(tabLabels[tabIndex]) || 0} assets
          </Typography>
        </>
      )}

      {!id ? (
        <>
          <TextField
            label="seed"
            type={showSeed ? 'text' : 'password'}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            variant="outlined"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowSeed(!showSeed)} edge="end">
                    {showSeed ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" color="primary" onClick={qLogin}>
            Login
          </Button>
        </>
      ) : (
        <>
          <Button variant="outlined" color="primary" onClick={() => setId('')}>
            Logout
          </Button>
          <FormControl fullWidth variant="outlined" sx={{ paddingTop: 1, marginTop: 2 }}>
            <InputLabel>Token</InputLabel>
            <Select sx={{ width: '20%', maxWidth: 200 }} value={tabIndex} onChange={changeAsset} label="Select Tab">
              {tabLabels.map((label, index) => (
                <MenuItem value={index} key={index}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <List>
            <TextField
              label="Amount"
              type="text"
              value={amount}
              onChange={handleInputChange(setAmount)}
              variant="outlined"
              inputProps={{
                pattern: '[0-9]*',
                inputMode: 'numeric',
              }}
            />
            <TextField
              label="Price"
              type="text"
              value={price}
              onChange={handleInputChange(setPrice)}
              variant="outlined"
              inputProps={{
                pattern: '[0-9]*',
                inputMode: 'numeric',
              }}
            />
            <Button variant="outlined" color="primary" onClick={() => qOrder(tabLabels[tabIndex], 'buy')}>
              buy {tabLabels[tabIndex]}
            </Button>
            <Button variant="outlined" color="primary" onClick={() => qOrder(tabLabels[tabIndex], 'sell')}>
              sell {tabLabels[tabIndex]}
            </Button>
            <Divider sx={{ bgcolor: 'black' }} />
            <Divider sx={{ bgcolor: 'black' }} />
            {showProgress && <LinearProgress />}
            LAST ACTION: {showProgress && log}
            <Divider sx={{ bgcolor: 'black' }} />
            LATEST TICK: {latestTick}
          </List>
          ASK
          {renderOrderList(askOrders, 'Ask')}
          BID
          {renderOrderList(bidOrders, 'Bid')}
        </>
      )}
    </>
  );
};

export default App;
