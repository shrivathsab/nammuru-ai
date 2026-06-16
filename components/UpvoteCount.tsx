import { Users } from 'lucide-react';

interface UpvoteCountProps {
  count: number;
  /** Visual size — 'sm' for inline chips, 'md' for cards. */
  size?: 'sm' | 'md';
}

const TEAL = '#0F6E56';

/**
 * Display-only corroboration count. The upvote is GPS-verified spatial
 * corroboration, so we frame it as "corroborated" rather than a like count.
 */
export default function UpvoteCount({ count, size = 'sm' }: UpvoteCountProps) {
  if (count <= 0) return null;
  const fontSize = size === 'md' ? 13 : 11;
  const iconSize = size === 'md' ? 14 : 12;
  return (
    <span
      title={`${count} citizen${count === 1 ? '' : 's'} physically corroborated this issue`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(15,110,86,0.15)',
        color: TEAL,
        padding: size === 'md' ? '3px 10px' : '2px 8px',
        borderRadius: 9999,
        fontSize,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 500,
      }}
    >
      <Users size={iconSize} />
      {count}
    </span>
  );
}
