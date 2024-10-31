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
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import CircleIcon from "@mui/icons-material/Circle";
import RefreshIcon from "@mui/icons-material/Refresh";
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

  // const p = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  useEffect(() => {
    let intervalId;

    if (id.length > 0) {
      intervalId = setInterval(async () => {
        qBalance();
        qOwnedAssets();
        setLatestTick(`LATEST TICK: ${await qFetchLatestTick()}`);
      }, 3000);
    }

    // Cleanup the interval on component unmount or when isLoggedIn changes
    return () => clearInterval(intervalId);
  }, [id]); // Depend on isLoggedIn

  const valueOfAssetName = (asset) => {
    const bytes = new Uint8Array(8);
    bytes.set(new TextEncoder().encode(asset));

    return new DataView(bytes.buffer).getInt32(0, true);
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
    const balanceObject = data["balance"];
    setBalance(balanceObject.balance);
    console.log("balance: ", balanceObject.balance);
    return data["balance"];
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
    // console.log(data["ownedAssets"]); // data.issuedAsset.name = QFT .. data.numberOfUnits
    console.log(
      "assets",
      new Map(
        data["ownedAssets"].map((el) => [
          el.data.issuedAsset.name,
          el.data.numberOfUnits,
        ])
      )
    );

    setAssets(
      new Map(
        data["ownedAssets"].map((el) => [
          el.data.issuedAsset.name,
          el.data.numberOfUnits,
        ])
      )
    );
  };

  const qLogin = async () => {
    console.log("qlogin");
    // shell.openExternal("https://www.example.com");

    const qubic = await new QubicHelper();
    const qubicPackage = await qubic.createIdPackage(seed);
    const ID = qubicPackage.publicId;
    setId(ID);
    console.log(qubicPackage.publicId);
    // // const res = await new QubicHelper().createIdPackage(p);
    // // console.log(res.publicId);
    const balance = await qBalance(ID);
    await qOwnedAssets(ID);

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
    qBalance();
    qOwnedAssets();
    setTimeout(() => {
      setLoadRefresh(false);
    }, 500); // Adjust time as needed
  };

  const qOrder = async (asset, type) => {
    console.log(`${type} ${amount} asset(s) of ${asset}`);

    //Get latest tick
    const latestTick = await qFetchLatestTick();
    const orderTick = latestTick + 5;
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
      orderTick,
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

  const items = [...ISSUER.keys()];

  return (
    <Box sx={{ backgroundColor: "#aacc99", width: "100vw", height: "100vh" }}>
      <CircleIcon sx={{ color: id ? "green" : "red" }}></CircleIcon>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 50, // Width of the box
          height: 50, // Height of the box
          backgroundColor: "#f0f0f0", // Background color
          borderRadius: "8px", // Rounded corners
          boxShadow: 2, // Shadow for a lifted effect
        }}
      >
        {loadRefresh ? (
          <CircularProgress sx={{ fontSize: 30, color: "#1976d2" }} />
        ) : (
          <RefreshIcon
            onClick={() => qRefresh()}
            sx={{ fontSize: 30, color: "#1976d2" }}
          />
        )}
      </Box>

      <Typography variant="h6" component="h4">
        {id ? `${id} connected` : "no ID connected"}
      </Typography>
      {id ? (
        <Typography variant="h6" component="h4">
          Balance: {balance + " qus"}
        </Typography>
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
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setShowOrders(!showOrders)}
          >
            {showOrders ? "Assets" : "Orderbooks"}
          </Button>
        </>
      )}

      {!showOrders ? (
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
          {items.map((item, index) => (
            <>
              <Divider sx={{ bgcolor: "secondary" }} />
              <ListItem key={index}>
                <ListItemText primary={item} />
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setTradingLink(
                      `https://qxinfo.qubic.org/#/issuer/${ISSUER.get(
                        item
                      )}/asset/${item}/orders`
                    );
                    setShowOrders(true);
                  }}
                >
                  Orders
                </Button>
                <Button variant="outlined" color="black">
                  {assets.size > 0 ? (
                    <ListItemText
                      primary={assets.get(item) ? assets.get(item) : 0}
                    />
                  ) : (
                    <>0</>
                  )}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => qOrder(item, "buy")}
                >
                  Buy
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => qOrder(item, "sell")}
                >
                  Sell
                </Button>
              </ListItem>
            </>
          ))}
          <Divider sx={{ bgcolor: "black" }} />
          {log}
          <Divider sx={{ bgcolor: "black" }} />
          {latestTick}
        </List>
      ) : (
        <Iframe
          url={tradingLink}
          width="100%"
          height="100%"
          id=""
          className=""
          display="block"
          position="relative"
        />
      )}
    </Box>
  );
};

export default App;
