import { PublicKey } from "@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey";
import { Long } from "@qubic-lib/qubic-ts-library/dist/qubic-types/Long";
import { QubicTransferQXOrderPayload } from "@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferQXOrderPayload";
import { valueOfAssetName } from "./valueOfAssetsName";

const createQXOrderPayload = (issuer: string, assetName: string, price: number, amount: number): QubicTransferQXOrderPayload => {
  return new QubicTransferQXOrderPayload({
    issuer: new PublicKey(issuer),
    assetName: new Long(Number(valueOfAssetName(assetName))),
    price: new Long(price),
    numberOfShares: new Long(amount),
  });
};

export default createQXOrderPayload;
