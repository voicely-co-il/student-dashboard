import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import voicelyLogo from '@/assets/voicely-logo.png';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get redirect URL from query params (for short links)
  const redirectUrl = searchParams.get('redirect');

  const getRedirectTo = () => {
    const baseUrl = window.location.origin;
    return redirectUrl ? `${baseUrl}${redirectUrl}` : `${baseUrl}/`;
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectTo(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: error.message || 'נסה שוב מאוחר יותר',
      });
      setIsGoogleLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectTo(),
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast({
        title: 'נשלח לינק למייל!',
        description: 'בדוק את תיבת הדואר שלך והקלק על הלינק להתחברות',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'שגיאה בשליחת הלינק',
        description: error.message || 'נסה שוב מאוחר יותר',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetMagicLink = () => {
    setMagicLinkSent(false);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md playful-shadow">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={voicelyLogo} alt="Voicely" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            ברוכים הבאים ל-Voicely
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            הפלטפורמה לפיתוח הקול שלך
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium border-2 bg-white text-gray-900 hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isGoogleLoading ? 'מתחבר...' : 'התחבר עם Google'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                או
              </span>
            </div>
          </div>

          {/* Magic Link Form */}
          {!magicLinkSent ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">התחברות עם מייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="ml-2 h-4 w-4" />
                )}
                {isLoading ? 'שולח...' : 'שלח לינק למייל'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <Mail className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="font-medium text-green-800 dark:text-green-200">
                  נשלח לינק ל-{email}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  בדוק את תיבת הדואר שלך (כולל ספאם)
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                onClick={resetMagicLink}
              >
                שלח שוב או נסה מייל אחר
              </Button>
            </div>
          )}

          {/* Footer note */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            בלחיצה על התחבר אתה מסכים ל
            <a href="/terms" className="underline hover:text-primary mx-1">
              תנאי השימוש
            </a>
            ול
            <a href="/privacy" className="underline hover:text-primary mx-1">
              מדיניות הפרטיות
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
