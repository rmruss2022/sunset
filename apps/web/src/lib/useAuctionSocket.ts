import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useAuctionSocket(auctionId: string | null) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!auctionId) return;

    const ws = new WebSocket('ws://localhost:4000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', auctionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'auction.updated' && msg.auctionId === auctionId) {
          queryClient.invalidateQueries({ queryKey: [['auction', 'getById']] });
        }
      } catch {
        // silent
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', auctionId }));
      }
      ws.close();
    };
  }, [auctionId, queryClient]);
}
