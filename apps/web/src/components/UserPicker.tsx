import { trpc } from '../lib/trpc';
import { useCurrentUser } from '../lib/userContext';

export function UserPicker() {
  const { userId, setUserId } = useCurrentUser();
  const { data: users } = trpc.auction.getUsers.useQuery();
  const current = users?.find((u) => u.id === userId);

  return (
    <div className="relative">
      <select
        value={userId ?? ''}
        onChange={(e) => setUserId(e.target.value)}
        className="h-8 pl-3 pr-7 text-xs tracking-wide appearance-none
                   bg-ah-surface border border-ah-border text-ah-text-2
                   hover:border-ah-border-gold hover:text-ah-text
                   focus:outline-none focus:border-ah-border-gold
                   transition-colors duration-200 cursor-pointer"
        style={{ minWidth: '9rem' }}
      >
        <option value="" disabled className="bg-ah-surface text-ah-text-3">
          Select bidder…
        </option>
        {users?.map((u) => (
          <option key={u.id} value={u.id} className="bg-ah-surface text-ah-text">
            {u.displayName}
          </option>
        ))}
      </select>

      {/* Custom chevron */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ah-text-3 text-[10px]">
        ▾
      </span>

      {/* Verified dot */}
      {current?.paymentVerified && (
        <span
          title="Payment verified"
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-ah-gold border border-ah-bg"
        />
      )}
    </div>
  );
}
