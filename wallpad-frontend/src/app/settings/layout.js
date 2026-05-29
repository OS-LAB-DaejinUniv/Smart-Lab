'use client'

import './page.css';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X as XIcon, LogOut } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { backendPort } from './_lib/backend';
import { authFetch, getAccessToken, getRefreshToken, refreshAccessToken, clearTokens, signoutHandler, tryPreauth } from './_lib/auth';
import { sectionMenu } from './_lib/menu';
import { fetchPublicConfig, DEFAULT_TITLE } from './_lib/publicConfig';

export default function SettingsLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isSignin = pathname === '/settings/signin';

    const [renewStatus, setRenewStatus] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [authState, setAuthState] = useState('checking'); // 'checking' | 'authed' | 'unauthed'
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

    // close mobile menu on route change
    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

    // load runtime-configurable title for the header
    useEffect(() => {
        let cancelled = false;
        fetchPublicConfig().then(cfg => {
            if (cancelled || !cfg || !cfg.title) return;
            setTitle(cfg.title);
        });
        return () => { cancelled = true; };
    }, []);

    // initial auth check (skipped on signin page).
    // If `?preauth=<hash>` is present, exchange it for tokens first; on success
    // strip the query param from the URL before continuing with the normal
    // verify flow so the hash never lingers in the address bar.
    useEffect(() => {
        if (isSignin) { setAuthState('authed'); return; }

        let cancelled = false;

        async function run() {
            // Reading window.location.search directly (instead of
            // useSearchParams) keeps the layout SSG-compatible — useSearchParams
            // would force a CSR bailout / Suspense boundary just for this one
            // client-side check.
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const preauthHash = params.get('preauth');
            if (preauthHash) {
                const ok = await tryPreauth(preauthHash);
                if (cancelled) return;
                // Drop the preauth param either way — if it failed, leaving it
                // there would just keep retrying on every render.
                // Use history.replaceState instead of router.replace to strip
                // the param without engaging Next's router state machine — the
                // latter caused a hook-count mismatch inside the App Router
                // when navigating away from a URL with searchParams mid-mount.
                params.delete('preauth');
                const qs = params.toString();
                const cleanUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
                if (ok) {
                    setAuthState('authed');
                    return;
                }
                // fall through to normal flow on failure
            }

            const currentToken = getAccessToken();
            if (!currentToken && !getRefreshToken()) {
                setAuthState('unauthed');
                router.replace('/settings/signin');
                return;
            }

            const verifyURL = new URL('/wallpad/management/token/verify', `http://${location.hostname}:${backendPort}`);
            try {
                const resp = await authFetch(verifyURL.href);
                const body = await resp.json().catch(() => ({ status: false }));
                if (cancelled) return;
                if (body.status) {
                    setAuthState('authed');
                } else {
                    setAuthState('unauthed');
                    router.replace('/settings/signin?expired=1');
                }
            } catch {
                if (cancelled) return;
                setAuthState('unauthed');
                router.replace('/settings/signin?expired=1');
            }
        }

        run();
        return () => { cancelled = true; };
    }, [isSignin, router]);

    // background token-expiry watcher: proactively refresh when <60s left
    useEffect(() => {
        if (isSignin) return;
        if (authState !== 'authed') return;

        async function checkToken() {
            if (typeof window === 'undefined') return;
            try {
                let jwt = getAccessToken();
                if (!jwt) {
                    const refreshed = await refreshAccessToken();
                    if (!refreshed) { clearTokens(); router.replace('/settings/signin?expired=1'); return; }
                    jwt = refreshed;
                }
                const payload = jwt.split('.')[1];
                if (!payload) { clearTokens(); router.replace('/settings/signin?expired=1'); return; }
                const exp = JSON.parse(atob(payload)).exp * 1000;
                let left = exp - Date.now();
                if (left < 60_000) {
                    const refreshed = await refreshAccessToken();
                    if (!refreshed) { clearTokens(); router.replace('/settings/signin?expired=1'); return; }
                    const newPayload = JSON.parse(atob(refreshed.split('.')[1]));
                    left = newPayload.exp * 1000 - Date.now();
                }
            } catch (err) {
                console.error('[checkToken] Error:', err);
                clearTokens();
                router.replace('/settings/signin?expired=1');
            }
        }

        checkToken();
        const interval = setInterval(checkToken, 5000);
        return () => clearInterval(interval);
    }, [isSignin, authState, router]);

    // signin page renders without the chrome but still needs the admin-shell
    // wrapper so the global kiosk styles (black bg, cursor: none) don't apply.
    if (isSignin) return <div className="admin-shell">{children}<Toaster /></div>;
    if (authState !== 'authed') return null;

    const activeSlug = pathname.split('/')[2] || 'system';
    const current = sectionMenu.find(s => s.slug === activeSlug);

    const logoutButton = (
        <button
            type="button"
            onClick={() => setLogoutDialogOpen(true)}
            className="inline-flex items-center justify-start rounded-md text-base font-medium text-stone-700 hover:bg-accent hover:text-accent-foreground w-full h-10 px-4 py-2 active:bg-gray-200 transition-colors duration-300"
        >
            <LogOut className="w-4 h-4 mr-2.5" strokeWidth={2} />
            로그아웃
        </button>
    );

    return (
        <div className="admin-shell flex flex-col items-center w-full min-h-screen">
            <header className="sticky flex px-3 sm:px-7 top-0 w-full h-[3.5rem] flex-shrink-0 z-30 max-w-screen-xl bg-white/95 backdrop-blur items-center">
                <button
                    className="md:hidden p-1.5 rounded-md hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <Label className="text-base sm:text-lg font-semibold ml-2 md:ml-0">{title}</Label>
            </header>

            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <nav className={`
                fixed top-[3rem] left-0 h-[calc(100vh-3rem)] w-64 bg-white z-30 shadow-lg transform transition-transform duration-200 ease-in-out
                md:hidden flex flex-col
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col p-4 gap-1 flex-1">
                    {sectionMenu.map(item => (
                        <Link
                            key={item.slug}
                            href={item.href}
                            className={`inline-flex items-center justify-left rounded-md text-base hover:text-accent-foreground w-full h-10 px-4 py-2 active:bg-gray-200 transition-colors duration-300 ` +
                                `${(activeSlug === item.slug) ? 'bg-accent font-semibold text-stone-950' : 'hover:bg-accent font-medium text-stone-700'}`}>
                            <item.icon className="w-4 h-4 mr-2.5" strokeWidth={2} />
                            {item.name}
                        </Link>
                    ))}
                    {logoutButton}
                </div>
            </nav>

            <div className="flex mt-4 w-full max-w-screen-xl justify-center px-4 sm:px-0">
                <nav className="hidden md:flex flex-col w-[12rem] mx-5 flex-shrink-0">
                    <div className="flex flex-col gap-1">
                        {sectionMenu.map(item => (
                            <Link
                                key={item.slug}
                                href={item.href}
                                className={`inline-flex items-center justify-left rounded-md text-base hover:text-accent-foreground w-full h-10 px-4 py-2 active:bg-gray-200 transition-colors duration-300 ` +
                                    `${(activeSlug === item.slug) ? 'bg-accent font-semibold text-stone-950' : 'hover:bg-accent font-medium text-stone-700'}`}>
                                <item.icon className="w-4 h-4 mr-2.5" strokeWidth={2} />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-1">{logoutButton}</div>
                </nav>
                <main className="w-full md:mx-5 min-w-0">
                    {current && (
                        <>
                            <h3 className="text-2xl font-semibold">{current.name}</h3>
                            <p className="text-lg sm:text-base font-medium text-muted-foreground mt-1 mb-5">{current.desc}</p>
                        </>
                    )}
                    {children}
                </main>
            </div>

            <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>로그아웃할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            관리자 페이지에서 로그아웃하려고 해요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={signoutHandler}>로그아웃</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </div>
    );
}
