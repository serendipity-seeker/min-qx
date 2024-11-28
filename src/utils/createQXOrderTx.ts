import { QubicTransferQXOrderPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferQXOrderPayload';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { Long } from '@qubic-lib/qubic-ts-library/dist/qubic-types/Long';

const createQXOrderTx = async (senderId: string, senderSeed: string, targetTick: number, payload: QubicTransferQXOrderPayload, actionType: number): Promise<QubicTransaction> => {
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
};

export default createQXOrderTx;
