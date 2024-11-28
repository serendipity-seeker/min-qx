import { BASE_URL } from '@/constants';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';

const broadcastTx = async (transaction: QubicTransaction): Promise<Response> => {
  const encodedTransaction = transaction.encodeTransactionToBase64(transaction.getPackageData());

  return await fetch(`${BASE_URL}/v1/broadcast-transaction`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ encodedTransaction }),
  });
};

export default broadcastTx;
