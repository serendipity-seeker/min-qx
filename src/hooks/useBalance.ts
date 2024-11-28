import { useState, useCallback } from 'react';
import { Balance } from '@/types';
import { BASE_URL } from '@/constants';

const useBalance = () => {
  const [balance, setBalance] = useState<Balance>({} as Balance);

  const fetchBalance = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/v1/balances/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      setBalance(data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, []);

  return {
    balance,
    fetchBalance
  };
};

export default useBalance;
