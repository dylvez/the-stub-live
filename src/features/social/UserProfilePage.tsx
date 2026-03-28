import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Calendar, Star, Ticket, UserPlus, UserMinus, Loader2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { db } from '@/services/firebase/config';
import { followUser, unfollowUser } from '@/services/firebase/social';
import { useAuth } from '@/contexts/AuthContext';
import type { UserData } from '@/types';

interface PublicStub {
  id: string;
  artistName: string;
  venueName: string;
  date: { toDate?: () => Date } | string;
  rating: number;
  highlights: string[];
  createdAt: { toDate?: () => Date } | string;
}

function toDate(val: { toDate?: () => Date } | string): Date {
  if (typeof val === 'string') return new Date(val);
  if (val && typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

export function UserProfilePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, refreshUserData } = useAuth();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [stubs, setStubs] = useState<PublicStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user?.uid === id;
  const isFollowing = userData?.following?.includes(id ?? '') ?? false;

  useEffect(() => {
    if (!id) return;

    async function load(): Promise<void> {
      try {
        const userSnap = await getDoc(doc(db, 'users', id!));
        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserData);
        }

        // Fetch their public stubs
        const q = query(
          collection(db, 'stubs'),
          where('userId', '==', id),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
        );
        const snapshot = await getDocs(q);
        setStubs(snapshot.docs.map((d) => d.data() as PublicStub));
      } catch (err) {
        console.warn('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleFollow(): Promise<void> {
    if (!user?.uid || !id || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, id);
      } else {
        await followUser(user.uid, id);
      }
      refreshUserData?.();
    } catch (err) {
      console.warn('Follow/unfollow failed:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-stub-muted">
        User not found.
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-stub-muted hover:text-stub-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Profile info */}
      <div className="px-4 flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-stub-border shrink-0">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stub-amber to-stub-coral flex items-center justify-center">
              <span className="text-xl font-bold text-stub-bg">
                {(profile.displayName ?? 'U').charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-stub-text text-xl truncate">
            {profile.displayName}
          </h1>
          {profile.handle && (
            <p className="text-sm text-stub-muted">@{profile.handle}</p>
          )}
          {profile.location && (
            <p className="text-xs text-stub-muted flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {profile.location.city}, {profile.location.state}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-stub-text/80 mt-2">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Follow button + stats */}
      <div className="px-4 flex items-center gap-4 mb-6">
        {!isOwnProfile && user && (
          <Button
            variant={isFollowing ? 'secondary' : 'primary'}
            size="sm"
            icon={followLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : isFollowing
                ? <UserMinus className="w-3.5 h-3.5" />
                : <UserPlus className="w-3.5 h-3.5" />
            }
            onClick={handleFollow}
            disabled={followLoading}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-sm font-display font-bold text-stub-text">{stubs.length}</div>
            <div className="text-[10px] text-stub-muted">Stubs</div>
          </div>
          <div>
            <div className="text-sm font-display font-bold text-stub-text">{profile.followers?.length ?? 0}</div>
            <div className="text-[10px] text-stub-muted">Followers</div>
          </div>
          <div>
            <div className="text-sm font-display font-bold text-stub-text">{profile.following?.length ?? 0}</div>
            <div className="text-[10px] text-stub-muted">Following</div>
          </div>
        </div>
      </div>

      {/* Public stubs */}
      <div className="px-4">
        <h2 className="font-display font-bold text-stub-text text-lg mb-3 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-stub-amber" />
          Stubs
          <span className="text-xs font-mono text-stub-muted ml-auto">{stubs.length}</span>
        </h2>

        {stubs.length === 0 ? (
          <div className="text-center py-8 text-stub-muted text-sm">
            No public stubs yet.
          </div>
        ) : (
          <div className="space-y-3">
            {stubs.map((stub) => {
              const d = toDate(stub.date);
              return (
                <motion.div key={stub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card hover className="paper-grain cursor-pointer" onClick={() => navigate(`/stub/${stub.id}`)}>
                    <div className="font-display font-bold text-stub-text text-base truncate">
                      {stub.artistName}
                    </div>
                    <div className="text-xs text-stub-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {stub.venueName}
                    </div>
                    <div className="text-xs font-mono text-stub-muted flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {stub.rating > 0 && (
                      <div className="flex items-center gap-0.5 mt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= stub.rating ? 'fill-stub-amber text-stub-amber' : 'text-stub-border'}`} />
                        ))}
                      </div>
                    )}
                    {stub.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {stub.highlights.slice(0, 3).map((h) => (
                          <Badge key={h} variant="amber" className="text-[9px]">{h}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
