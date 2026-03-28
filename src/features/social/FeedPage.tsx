import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityFeed, type FeedItem } from '@/hooks/useActivityFeed';
import { timeAgo } from '@/utils/timeAgo';

export function FeedPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const following = userData?.following ?? [];
  const { items, isLoading } = useActivityFeed(following);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <img src="/images/empty-no-feed.png" alt="Your feed is empty" className="w-48 h-48 mb-4 opacity-80" />
        <h3 className="font-display font-bold text-stub-text text-lg mb-1">Your feed is empty</h3>
        <p className="text-sm text-stub-muted max-w-xs">
          Follow people to see their concert stubs here. Explore events and find people who go to the same shows.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <img src="/images/empty-no-stubs.png" alt="No stubs yet" className="w-48 h-48 mb-4 opacity-80" />
        <h3 className="font-display font-bold text-stub-text text-lg mb-1">No stubs yet</h3>
        <p className="text-sm text-stub-muted max-w-xs">
          The people you follow haven't published any stubs yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FeedStubCard key={item.id} item={item} onClick={() => navigate(`/stub/${item.id}`)} />
      ))}
    </div>
  );
}

function FeedStubCard({ item, onClick }: { item: FeedItem; onClick: () => void }): React.JSX.Element {
  const ts = typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt.toDate();
  const eventDate = typeof item.date === 'string' ? new Date(item.date) : item.date.toDate();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-stub-border">
          {item.authorAvatar ? (
            <img src={item.authorAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stub-amber/30 to-stub-coral/30 flex items-center justify-center">
              <span className="text-[9px] font-bold text-stub-amber/60">{item.authorName.charAt(0)}</span>
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-stub-text">{item.authorName}</span>
        <span className="text-[10px] text-stub-muted">{timeAgo(ts)}</span>
      </div>

      <Card hover className="paper-grain cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-stub-text text-base truncate">
              {item.artistName}
            </div>
            <div className="text-xs text-stub-muted flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {item.venueName}
            </div>
            <div className="text-xs font-mono text-stub-muted flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </div>
            {item.rating > 0 && (
              <div className="flex items-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img
                    key={i}
                    src={i <= item.rating ? '/images/star-filled.png' : '/images/star-empty.png'}
                    alt=""
                    className="w-3.5 h-3.5"
                  />
                ))}
              </div>
            )}
            {item.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.highlights.slice(0, 3).map((h) => (
                  <Badge key={h} variant="amber" className="text-[9px]">{h}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
