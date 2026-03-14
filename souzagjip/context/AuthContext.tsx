import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── 타입 ─────────────────────────────────────────────────
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  bookmarks: string[];
  toggleBookmark: (bookId: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  bookmarks: [],
  toggleBookmark: async () => {},
  signOut: async () => {},
  enterAsGuest: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // ── 세션 초기 로드 + 변경 구독 ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 로그인 후 북마크 로드 ──
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    supabase
      .from('bookmarks')
      .select('book_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setBookmarks(data.map((r) => r.book_id));
      });
  }, [user]);

  // ── 북마크 토글 ──
  const toggleBookmark = useCallback(
    async (bookId: string) => {
      if (!user) return;
      const isBookmarked = bookmarks.includes(bookId);

      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId);
        setBookmarks((prev) => prev.filter((id) => id !== bookId));
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, book_id: bookId });
        setBookmarks((prev) => [...prev, bookId]);
      }
    },
    [user, bookmarks]
  );

  // ── 비회원 입장 ──
  const enterAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  // ── 로그아웃 ──
  const signOut = useCallback(async () => {
    setIsGuest(false);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, bookmarks, toggleBookmark, signOut, enterAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}