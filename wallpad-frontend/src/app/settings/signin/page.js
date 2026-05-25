'use client'

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, User as UserIcon } from 'lucide-react';
import { backendPort } from '../_lib/backend';
import { setTokens } from '../_lib/auth';
import { fetchPublicConfig, DEFAULT_TITLE } from '../_lib/publicConfig';

const messages = {
    'TOKEN_EXPIRED':  '로그인 정보가 만료되어 로그아웃 되었어요.',
    'LOGIN_FAILED':   '사용자 이름 또는 비밀번호를 다시 확인해 주세요.',
    'USERNAME_EMPTY': '사용자 이름을 입력하지 않았어요.',
    'PASSWORD_EMPTY': '비밀번호를 입력하지 않았어요.',
};

function SigninContent() {
    const searchParams = useSearchParams();
    const initial = searchParams.get('expired') ? 'TOKEN_EXPIRED' : null;
    const [signinStatus, setSigninStatus] = useState(initial);
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const refUsername = useRef(null);
    const refPassword = useRef(null);

    useEffect(() => {
        let cancelled = false;
        fetchPublicConfig().then(cfg => {
            if (cancelled || !cfg || !cfg.title) return;
            setTitle(cfg.title);
        });
        return () => { cancelled = true; };
    }, []);

    function loginHandler(event) {
        event.preventDefault();
        if (!refUsername.current.value) { setSigninStatus('USERNAME_EMPTY'); return; }
        if (!refPassword.current.value) { setSigninStatus('PASSWORD_EMPTY'); return; }

        fetch(new URL('/wallpad/management/signin', `http://${location.hostname}:${backendPort}`).href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: refUsername.current.value,
                password: refPassword.current.value,
            })
        })
            .then(resp => resp.json())
            .then(body => {
                if (body.status && body.accessToken) {
                    setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
                    window.location.href = '/settings/system';
                } else {
                    setSigninStatus('LOGIN_FAILED');
                }
            })
            .catch(err => {
                console.error('failed to login.', err);
                setSigninStatus('LOGIN_FAILED');
            });
    }

    return (
        <main className='flex flex-col bg-accent w-[100vw] h-[100vh] justify-center items-center'>
            <Card className='flex flex-col justify-center items-center p-7 w-[380px]'>
                <h1 className="text-2xl font-bold tracking-tight mb-5">
                    {title}
                </h1>
                <form className='flex flex-col gap-2'>
                    <Label>사용자 이름</Label>
                    <Input id="username" type="text" className="mb-2.5" ref={refUsername} />
                    <Label>비밀번호</Label>
                    <Input type="password" ref={refPassword} />
                    {signinStatus && (
                        <Label className='text-sm text-red-700'>{messages[signinStatus]}</Label>
                    )}
                    <Button className="w-full font-semibold my-2.5" onClick={loginHandler}>
                        로그인
                    </Button>
                </form>
            </Card>
        </main>
    );
}

export default function SigninPage() {
    return (
        <Suspense fallback={null}>
            <SigninContent />
        </Suspense>
    );
}
