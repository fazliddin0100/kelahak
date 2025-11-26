'use client';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WafAdminPage() {
  const { data, mutate } = useSWR('/api/waf/ips', fetcher, {
    refreshInterval: 5000,
  });

  const blockIp = async (ip: string) => {
    await fetch('/api/waf/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    mutate();
  };

  const unblockIp = async (ip: string) => {
    await fetch('/api/waf/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    mutate();
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seen IPs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.seen.map((ip: string) => (
              <li
                key={ip}
                className="flex items-center justify-between border-b pb-2">
                <span>{ip}</span>
                {data.blocked.includes(ip) ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => unblockIp(ip)}>
                    Unblock
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => blockIp(ip)}>
                    Block
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
