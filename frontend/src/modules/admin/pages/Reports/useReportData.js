import { useCallback, useState } from 'react';
import usePolling from '../../../../hooks/usePolling';

export default function useReportData(request, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError('');
    try {
      const result = await request();
      if (!Array.isArray(result)) {
        throw new Error('The report returned an invalid response.');
      }
      setData(result);
    } catch (requestError) {
      setData(null);
      setError(
        requestError?.response?.data?.error ||
        requestError?.response?.data?.message ||
        requestError?.data?.error ||
        requestError?.data?.message ||
        requestError?.message ||
        'Unable to load this report.'
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, request]);

  usePolling(refresh, 30000, enabled);

  return { data, loading, error, refresh };
}
