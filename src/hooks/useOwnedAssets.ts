import { useState, useCallback } from 'react';
import { OwnedAsset } from '@/types';
import { BASE_URL } from '@/constants';
const useOwnedAssets = () => {
  const [assets, setAssets] = useState<Map<string, number>>(new Map());

  const fetchOwnedAssets = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${BASE_URL}/v1/assets/${id}/owned`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      setAssets(new Map(data.ownedAssets.map((el: OwnedAsset) => [el.data.issuedAsset.name, el.data.numberOfUnits])));
    } catch (error) {
      console.error('Error fetching owned assets:', error);
    }
  }, []);

  return {
    assets,
    fetchOwnedAssets,
  };
};

export default useOwnedAssets;
