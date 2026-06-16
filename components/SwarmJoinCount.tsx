'use client';

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase';

interface SwarmJoinCountProps {
  swarmId: string;
  baseVoices: number; // report_count + upvote_count at render time
}

/**
 * Live "voices" counter for a swarm. Subscribes to swarm_joins inserts via
 * Supabase Realtime and increments. Degrades silently if realtime is not
 * enabled on the table — the base count still renders.
 */
export default function SwarmJoinCount({ swarmId, baseVoices }: SwarmJoinCountProps) {
  const [joins, setJoins] = useState(0);

  useEffect(() => {
    const supabase = getBrowserClient();
    let active = true;

    // Initial join count
    supabase
      .from('swarm_joins')
      .select('id', { count: 'exact', head: true })
      .eq('swarm_id', swarmId)
      .then(({ count }) => {
        if (active && typeof count === 'number') setJoins(count);
      });

    const channel = supabase
      .channel(`swarm:${swarmId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'swarm_joins', filter: `swarm_id=eq.${swarmId}` },
        () => setJoins((n) => n + 1),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [swarmId]);

  const total = baseVoices + joins;
  return (
    <span style={{ color: '#d4a843', fontWeight: 600 }}>
      {total} {total === 1 ? 'voice' : 'voices'}
    </span>
  );
}
