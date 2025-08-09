import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface HealthSummary {
  status?: string;
  [key: string]: unknown;
}

export function DevDiagnostics() {
  const envFlags = [
    { key: 'VITE_SUPABASE_URL', present: Boolean(import.meta.env.VITE_SUPABASE_URL) },
    { key: 'VITE_SUPABASE_ANON_KEY', present: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) },
  ];

  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        setError('Supabase URL not configured');
        return;
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/admin-tools/db-health`);
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      }
    };

    fetchHealth();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dev Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 font-medium text-sm">Env Variables</h4>
          <ul className="space-y-1">
            {envFlags.map((flag) => (
              <li key={flag.key} className="flex items-center gap-2">
                <Badge variant={flag.present ? 'default' : 'destructive'}>
                  {flag.present ? 'present' : 'missing'}
                </Badge>
                <span className="font-mono text-xs">{flag.key}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-sm">DB Health</h4>
          {health && (
            <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
          {!health && !error && (
            <p className="text-sm text-muted-foreground">Checking...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DevDiagnostics;
