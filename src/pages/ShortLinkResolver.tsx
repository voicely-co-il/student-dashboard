import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const ShortLinkResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to auth with return URL
    if (!user) {
      const returnUrl = encodeURIComponent(location.pathname);
      navigate(`/auth?redirect=${returnUrl}`, { replace: true });
      return;
    }

    if (!slug) {
      setError('קישור לא תקין');
      setResolving(false);
      return;
    }

    const resolveLink = async () => {
      try {
        const { data, error: rpcError } = await supabase
          .rpc('resolve_short_link', { p_slug: slug });

        if (rpcError) {
          console.error('Error resolving short link:', rpcError);
          setError('שגיאה בפענוח הקישור');
          setResolving(false);
          return;
        }

        if (!data || data.length === 0) {
          setError('הקישור לא נמצא');
          setResolving(false);
          return;
        }

        const { link_type, target_id } = data[0];

        // Navigate to the target based on link type
        switch (link_type) {
          case 'student':
            navigate(`/student`, { replace: true });
            break;
          case 'lesson':
            navigate(`/student/lesson/${target_id}`, { replace: true });
            break;
          case 'recording':
            navigate(`/student/recording/${target_id}`, { replace: true });
            break;
          default:
            setError('סוג קישור לא מוכר');
            setResolving(false);
        }
      } catch (err) {
        console.error('Error resolving link:', err);
        setError('שגיאה בטעינת הקישור');
        setResolving(false);
      }
    };

    resolveLink();
  }, [slug, user, authLoading, navigate, location.pathname]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">שגיאה</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">מעביר אותך...</p>
      </div>
    </div>
  );
};

export default ShortLinkResolver;
