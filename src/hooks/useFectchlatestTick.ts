import { BASE_URL } from '@/constants';
import { useState, useCallback } from 'react';

const useFetchLatestTick = () => {
  const [latestTick, setLatestTick] = useState<number>(0);

  const fetchLatestTick = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/v1/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      setLatestTick(data['lastProcessedTick']['tickNumber']);
    } catch (error) {
      console.error('Error fetching latest tick:', error);
    }
  }, []);

  return {
    latestTick,
    fetchLatestTick
  };
};

export default useFetchLatestTick;
