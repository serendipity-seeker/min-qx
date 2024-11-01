import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  AppBar,
  Tabs,
  Tab,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  ListItemButton,
  Checkbox,
  ListItemIcon,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import CircleIcon from "@mui/icons-material/Circle";
import Iframe from "react-iframe";
import React, { useState, useEffect } from "react";

// QUBIC
import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper.js";
import { QubicTransferQXOrderPayload } from "@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferQXOrderPayload.js";

import { QubicPackageBuilder } from "@qubic-lib/qubic-ts-library/dist/QubicPackageBuilder.js";
import { QubicTransaction } from "@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction.js";

import { QubicPackageType } from "@qubic-lib/qubic-ts-library/dist/qubic-communication/QubicPackageType.js";
import { RequestResponseHeader } from "@qubic-lib/qubic-ts-library/dist/qubic-communication/RequestResponseHeader.js";

import { QubicDefinitions } from "@qubic-lib/qubic-ts-library/dist/QubicDefinitions.js";
import { PublicKey } from "@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey.js";
import { Long } from "@qubic-lib/qubic-ts-library/dist/qubic-types/Long.js";

const apiURL = "https://api.qubic.org";
const baseURL = "https://rpc.qubic.org";
const tradingURL = "https://qxinfo.qubic.org/#/assets";

const ISSUER = new Map([
  ["QX", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["RANDOM", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["QUTIL", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["QTRY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["MLM", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["QPOOL", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB"],
  ["QFT", "TFUYVBXYIYBVTEMJHAJGEJOOZHJBQFVQLTBBKMEHPEVIZFXZRPEYFUWGTIWG"],
  ["CFB", "CFBMEMZOIDEXQAUXYYSZIURADQLAPWPMNJXQSNVQZAHYVOPYUKKJBJUCTVJL"],
  ["QWALLET", "QWALLETSGQVAGBHUCVVXWZXMBKQBPQQSHRYKZGEJWFVNUFCEDDPRMKTAUVHA"],
  ["QCAP", "QCAPWMYRSHLBJHSTTZQVCIBARVOASKDENASAKNOBRGPFWWKRCUVUAXYEZVOG"],
]);

const App = () => {
  // Declare a state variable 'count' and a function to update it
  const [id, setId] = useState("");
  const [balance, setBalance] = useState(0);
  const [assets, setAssets] = useState([]);
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);
  const [showOrders, setShowOrders] = useState(true);
  const [tradingLink, setTradingLink] = useState(tradingURL);
  const [loadRefresh, setLoadRefresh] = useState(false);

  const [seed, setSeed] = useState("");
  const [showSeed, setShowSeed] = useState(false);
  const [latestTick, setLatestTick] = useState("LATEST TICK:");
  const [log, setLog] = useState("LOG: ");
  const [orderTick, setOrderTick] = useState(0);
  const [showLog, setShowLog] = useState(false);

  const [askOrders, setAskOrders] = useState([]);
  const [bidOrders, setBidOrders] = useState([]);
  const [tabIndex, setTabIndex] = useState(7);

  useEffect(() => {
    //Implementing the setInterval method
    const interval = setInterval(() => {
      setShowLog(latestTick < orderTick);
    }, 2000);

    //Clearing the interval
    return () => clearInterval(interval);
  }, []);

  // const p = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const valueOfAssetName = (asset) => {
    const bytes = new Uint8Array(8);
    bytes.set(new TextEncoder().encode(asset));

    return new DataView(bytes.buffer).getInt32(0, true);
  };

  const fetchAssetOrders = async (assetName, issuerID, type, offset) => {
    const response = await fetch(
      apiURL +
        `/v1/qx/getAsset${type}Orders?assetName=${assetName}&issuerId=${issuerID}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response;
  };

  const createQXOrderPayload = (issuer, assetName, price, numberOfShares) => {
    return new QubicTransferQXOrderPayload({
      issuer: new PublicKey(issuer),
      assetName: new Long(valueOfAssetName(assetName)),
      price: new Long(price),
      numberOfShares: new Long(numberOfShares),
    });
  };

  const createQXOrderTransaction = async (
    senderId,
    senderSeed,
    targetTick,
    payload,
    actionType
  ) => {
    const transaction = new QubicTransaction()
      .setSourcePublicKey(new PublicKey(senderId))
      .setDestinationPublicKey(QubicDefinitions.QX_ADDRESS)
      .setTick(targetTick)
      .setInputSize(payload.getPackageSize())
      .setAmount(new Long(0))
      .setInputType(actionType)
      .setPayload(payload);
    if (actionType === QubicDefinitions.QX_ADD_BID_ORDER) {
      transaction.setAmount(new Long(payload.getTotalAmount()));
    }

    await transaction.build(senderSeed);

    return transaction;
  };

  const broadcastTransaction = async (transaction) => {
    const encodedTransaction = transaction.encodeTransactionToBase64(
      transaction.getPackageData()
    );

    return await fetch(baseURL + "/v1/broadcast-transaction", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        encodedTransaction: encodedTransaction,
      }),
    });
  };

  const qBalance = async (ID) => {
    const response = await fetch(baseURL + `/v1/balances/${ID ? ID : id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();
    return data["balance"];
  };

  const qFetchAssetOrders = async (assetName, type) => {
    // get destination address
    const response = await fetchAssetOrders(
      assetName,
      ISSUER.get(assetName),
      type,
      0
    );
    const data = await response.json();

    const objectString = JSON.stringify(data, null, 2); // Pretty print with 2 spaces
    // console.log(objectString);
    return type === "Ask" ? data["orders"].reverse() : data["orders"];
  };

  const qFetchLatestTick = async () => {
    const response = await fetch(baseURL + "/v1/status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();
    return data["lastProcessedTick"]["tickNumber"];
  };

  const qOwnedAssets = async (ID) => {
    const response = await fetch(baseURL + `/v1/assets/${ID ? ID : id}/owned`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();
    return data["ownedAssets"];
  };

  const qLogin = async () => {
    console.log("qlogin");

    const qubic = await new QubicHelper();
    const qubicPackage = await qubic.createIdPackage(seed);
    const ID = qubicPackage.publicId;
    setId(ID);
    console.log(qubicPackage.publicId);
    // // const res = await new QubicHelper().createIdPackage(p);
    // // console.log(res.publicId);
    setBalance((await qBalance(ID)).balance);
    setAssets(
      new Map(
        (await qOwnedAssets(ID)).map((el) => [
          el.data.issuedAsset.name,
          el.data.numberOfUnits,
        ])
      )
    );

    setShowOrders(false);
  };

  const qLogout = async () => {
    console.log("qlogout");
    setId(""); // Assume login is successful
    setShowOrders(true);
    setTradingLink(tradingURL);
  };

  const qRefresh = async () => {
    console.log("qRefresh");
    setLoadRefresh(true);
    setBalance(await qBalance());
    qOwnedAssets();
    setTimeout(() => {
      setLoadRefresh(false);
    }, 500); // Adjust time as needed
  };

  const qOrder = async (asset, type) => {
    console.log(`${type} ${amount} asset(s) of ${asset}`);

    //Get latest tick
    const latestTick = await qFetchLatestTick();
    setOrderTick(latestTick + 10);
    //Assemble transaction payload
    const orderPayload = createQXOrderPayload(
      ISSUER.get(asset),
      asset,
      price,
      amount
    );

    console.log(orderPayload);

    //Assemble transaction
    const transaction = await createQXOrderTransaction(
      id,
      seed,
      latestTick + 10,
      orderPayload,
      type === "buy"
        ? QubicDefinitions.QX_ADD_BID_ORDER
        : QubicDefinitions.QX_ADD_ASK_ORDER
    );

    console.log(transaction);
    //Broadcast transaction
    const res = await broadcastTransaction(transaction);
    console.log(await res.json());
    setLog(
      `LOG: ${
        type === "buy" ? "Buying" : "Selling"
      } ${amount} asset(s) of ${asset} for ${price} qu per token on tick ${orderTick}`
    );
    return "OK";
  };

  const handleChangeAmount = (event) => {
    const newValue = event.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(newValue)) {
      setAmount(newValue);
    }
  };
  const handleChangePrice = (event) => {
    const newValue = event.target.value;
    // Allow only numeric input
    if (/^\d*$/.test(newValue)) {
      setPrice(newValue);
    }
  };

  const handleChange = (event) => {
    setSeed(event.target.value);
  };

  const handleClickShowPassword = () => {
    setShowSeed(!showSeed);
  };

  useEffect(() => {
    let intervalId;

    if (id.length > 0) {
      intervalId = setInterval(async () => {
        setBalance((await qBalance()).balance);
        setAssets(
          new Map(
            (await qOwnedAssets()).map((el) => [
              el.data.issuedAsset.name,
              el.data.numberOfUnits,
            ])
          )
        );
        // setAskOrders(await qFetchAssetOrders(tabLabels[tabIndex], "Ask"));
        // setBidOrders(await qFetchAssetOrders(tabLabels[tabIndex], "Bid"));
        setLatestTick(`LATEST TICK: ${await qFetchLatestTick()}`);
        // await qFetchAssetOrders();
      }, 5000);
    }

    // Cleanup the interval on component unmount or when isLoggedIn changes
    return () => clearInterval(intervalId);
  }, [id]); // Depend on isLoggedIn

  // START
  const handleChanged = async (event) => {
    setTabIndex(event.target.value);
    setAskOrders(await qFetchAssetOrders(tabLabels[event.target.value], "Ask"));
    setBidOrders(await qFetchAssetOrders(tabLabels[event.target.value], "Bid"));
  };

  const tabLabels = [...ISSUER.keys()];

  const [selectedAsk, setSelectedAsk] = useState(-1);
  const [selectedBid, setSelectedBid] = useState(-1);

  return (
    <>
      <Box sx={{ width: "100%" }}>
        {/* <AppBar position="static">
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
          >
            {tabLabels.map((label, index) => (
              <Tab label={label} key={index} />
            ))}
          </Tabs>
        </AppBar> */}
        {/* <Box sx={{ padding: 3 }}>
          {tabIndex === 0 && <div>Content for Tab 1</div>}
          {tabIndex === 1 && <div>Content for Tab 2</div>}
          {tabIndex === 2 && <div>Content for Tab 3</div>}
        </Box> */}
      </Box>
      <Typography variant="h6" component="h4">
        <CircleIcon sx={{ color: id ? "green" : "red" }}></CircleIcon>
        {id ? `ID: ${id}` : " no ID connected"}
      </Typography>
      {id ? (
        <>
          <Typography variant="h6" component="h4">
            BALANCE: {balance + " qus"}
          </Typography>
          <Typography variant="h6" component="h4">
            {tabLabels[tabIndex]}:{" "}
            {assets.size > 0 && assets.get(tabLabels[tabIndex])
              ? assets.get(tabLabels[tabIndex])
              : 0}{" "}
            assets
          </Typography>
        </>
      ) : (
        <></>
      )}
      {/* <TextField label="enter seed" variant="outlined" fullWidth /> */}
      {!id ? (
        <>
          {" "}
          <TextField
            label="seed"
            type={showSeed ? "text" : "password"}
            value={seed}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showSeed ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" color="primary" onClick={() => qLogin()}>
            Login
          </Button>
        </>
      ) : (
        <>
          <>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => qLogout()}
            >
              Logout
            </Button>
          </>
        </>
      )}
      <FormControl
        fullWidth
        variant="outlined"
        sx={{ paddingTop: 1, marginTop: 2 }}
      >
        <InputLabel>Token</InputLabel>
        <Select value={tabIndex} onChange={handleChanged} label="Select Tab">
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
          onChange={handleChangeAmount}
          variant="outlined"
          inputProps={{
            pattern: "[0-9]*", // Pattern for numeric input
            inputMode: "numeric", // Show numeric keyboard on mobile
          }}
        />
        <TextField
          label="Price"
          type="text"
          value={price}
          onChange={handleChangePrice}
          variant="outlined"
          inputProps={{
            pattern: "[0-9]*", // Pattern for numeric input
            inputMode: "numeric", // Show numeric keyboard on mobile
          }}
        />
        <Button
          variant="outlined"
          color="primary"
          onClick={() => qOrder(tabLabels[tabIndex], "buy")}
        >
          buy {tabLabels[tabIndex]}
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => qOrder(tabLabels[tabIndex], "sell")}
        >
          sell {tabLabels[tabIndex]}
        </Button>
        <Divider sx={{ bgcolor: "black" }} />
        <Divider sx={{ bgcolor: "black" }} />
        {showLog ? { log } : <></>}
        <Divider sx={{ bgcolor: "black" }} />
        {latestTick}
      </List>
      ASK
      <Box sx={{ width: "100%", maxWidth: 900, bgcolor: "background.paper" }}>
        {/* <Typography variant="h6" sx={{ padding: 2 }}>
          Orders
        </Typography> */}

        <List
          sx={{ width: "100%", maxWidth: 900, bgcolor: "background.paper" }}
        >
          {askOrders.map((item, index) => {
            const labelId = `checkbox-list-label-${item}`;

            return (
              <ListItem
                key={item}
                // secondaryAction={
                //   <IconButton edge="end" aria-label="comments">
                //     <CommentIcon />
                //   </IconButton>
                // }
                onClick={() => {
                  setSelectedAsk(index);
                  setSelectedBid(-1);
                }}
                disablePadding
              >
                <ListItemButton
                  role={undefined}
                  // onClick={handleToggle(value)}
                  dense
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={index === selectedAsk}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={item.price} />
                  <ListItemText primary={item.numberOfShares} />
                  <ListItemText
                    key={item.entityId + index}
                    primary={
                      <Typography
                        variant="body2"
                        style={{
                          color: id === item.entityId ? "#4422FF" : "FFFFFF",
                        }}
                      >
                        {item.entityId}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
      BID
      <Box sx={{ width: "100%", maxWidth: 900, bgcolor: "background.paper" }}>
        {/* <Typography variant="h6" sx={{ padding: 2 }}>
          Orders
        </Typography> */}

        <List
          sx={{ width: "100%", maxWidth: 900, bgcolor: "background.paper" }}
        >
          {bidOrders.map((item, index) => {
            const labelId = `checkbox-list-label-${item}`;

            return (
              <ListItem
                key={item}
                // secondaryAction={
                //   <IconButton edge="end" aria-label="comments">
                //     <CommentIcon />
                //   </IconButton>
                // }
                onClick={() => {
                  setSelectedBid(index);
                  setSelectedAsk(-1);
                }}
                disablePadding
              >
                <ListItemButton
                  role={undefined}
                  // onClick={handleToggle(value)}
                  dense
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={index === selectedBid}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={item.price} />
                  <ListItemText primary={item.numberOfShares} />
                  <ListItemText
                    key={item.entityId + index}
                    primary={
                      <Typography
                        variant="body2"
                        style={{
                          color: id === item.entityId ? "#4422FF" : "FFFFFF",
                        }}
                      >
                        {item.entityId}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </>
  );
};

export default App;
