import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useOrgFromUrl(setOrgId: (id: string) => void) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const orgFromUrl = searchParams.get('org');
    if (orgFromUrl) {
      setOrgId(orgFromUrl);
      const next = new URLSearchParams(searchParams);
      next.delete('org');
      setSearchParams(next, { replace: true });
    }
  }, []);
}
