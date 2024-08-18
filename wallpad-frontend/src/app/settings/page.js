'use client'

import Image from 'next/image';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect, useRef, use } from 'react';
import useHash from '../hooks/useHash';
import Profile from '../components/Profile';
import Advertisement from '../components/Advertisement';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import delay from '../utils/delay';
const backendPort = require('../../../package').config.socketioPort;
import './page.css';

function signoutHandler() {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
        window.location.hash = '';
        window.location.reload();
    }
};

export default function Router() {
    const requestHash = useHash();
    let currentToken = (() => {
        if (typeof window !== "undefined") {
            return window.localStorage.getItem('token');
        }
    })();
    let [isTokenValid, setIsTokenValid] = useState(null);
    let [hashTo, setHashTo] = useState(null);

    useEffect(() => {
        // redirected to signin page if token is empty or not set.
        if (!currentToken) setHashTo('#signin');

        // if token already exists, call the api to verify its validity.
        const verifyURL = new URL('/wallpad/management/token/verify', `http://${location.hostname}:${backendPort}`);
        verifyURL.searchParams.append('token', currentToken);

        fetch(verifyURL.href)
            .then(resp => resp.json())
            .then(body => {
                if (!body.status) {
                    // if token invalid
                    setIsTokenValid(false);

                } else {
                    // if token valids
                    setIsTokenValid(true);
                }
            });
    }, []);

    useEffect(() => {
        if (isTokenValid == null) return;

        if (isTokenValid == false) {
            console.log('token expired or invalid. -> #expired.');
            setHashTo('#expired');

        } else if (isTokenValid && requestHash == '') {
            console.log('token valid && no requestHash -> #system');
            setHashTo('#system');

        } else if (isTokenValid && requestHash != '') {
            console.log('token valid && requestHash exist ->' + requestHash);
            setHashTo(requestHash);
        }

    }, [isTokenValid]);

    if (!hashTo) {
        return;

    } else {
        // if token valids
        switch (hashTo) {
            case '#signin':
                return <Signin />;

            case '#system':
                return <Home />

            case '#member':
                return <Home />

            case '#ad':
                return <Home />

            case '#expired':
                return <Signin statusCode="TOKEN_EXPIRED" />;
        }
    }
};

function Home() {
    const hash = useHash();
    const hashList = {
        '#system': {
            name: '시스템 상태',
            desc: '시스템의 상태를 확인하거나 변경할 수 있어요.'
        },
        '#card': {
            name: '스마트카드',
            desc: '부원의 스마트카드를 등록 또는 삭제하거나 변경할 수 있어요.'
        },
        '#ad': {
            name: '연구실 소식',
            desc: '월패드에 표시되는 연구실 소식을 추가 또는 삭제할 수 있어요.'
        },
        '#log': {
            name: '로그 조회',
            desc: '출퇴근 내역 또는 시스템 로그를 조회할 수 있어요.'
        },
        '#config': {
            name: '환경설정',
            desc: '월패드 설정을 변경할 수 있어요.'
        },
    };

    return (
        <>
            <div className="flex flex-col items-center w-full">
                <header className="sticky flex px-7 top-0 w-full h-[3rem] bg-blue backdrop-blur items-center border-b border-slate-300 justify-between">
                    <Label className="text-lg font-semibold">OSLab. Wallpad Management Console</Label>
                    <div className="flex">
                        <Button
                            variant="ghost"
                            className="font-semibold active:bg-gray-200"
                            onClick={signoutHandler}>
                            로그아웃
                        </Button>
                    </div>
                </header>
                <div className="flex mt-[1rem] w-full max-w-screen-xl justify-center">
                    <nav className="flex flex-col w-[17rem] mx-5 gap-1">
                        {
                            Object.keys(hashList).map(menu => {
                                return (
                                    <a
                                        key={menu}
                                        href={menu}
                                        className={`inline-flex items-center justify-left rounded-md text-sm hover:text-accent-foreground w-full h-10 px-4 py-2 font-semibold active:bg-gray-200 ` +
                                            `${hash == menu ? 'bg-accent' : 'hover:bg-accent hover:underline'}`}>
                                        {hashList[menu].name}
                                    </a>
                                )
                            })
                        }
                    </nav>
                    <main className="w-full mx-5">
                        <h3 className="text-lg font-medium">
                            {hashList[hash].name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {hashList[hash].desc}
                        </p>
                        <Separator className="my-4" />
                        {
                            (() => {
                                switch (hash) {
                                    case '#system':
                                        return <SystemSection />
                                }
                            })()
                        }
                    </main>
                </div>
            </div>
        </>
    )
}

// contents of the section `#system`.
function SystemSection() {
    let [isOpenRebootDialog, setIsOpenRebootDialog] = useState(false);
    const refreshButtonRef = useRef(null);
    const rebootButtonRef = useRef(null);

    function wallpadReload() {
        const refreshURL = new URL('/wallpad/refresh', `http://${location.hostname}:${backendPort}`);

        fetch(refreshURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : ''),
                rmcache: true
            })
        })
            .then(res => res.json())
            .then(async body => {
                if (body.status) {
                    refreshButtonRef.current.disabled = true;
                    refreshButtonRef.current.innerText = '새로고침 완료!';
                    await delay(1000);
                    refreshButtonRef.current.disabled = false;
                    refreshButtonRef.current.innerText = '화면 새로고침';
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                refreshButtonRef.current.disabled = true;
                refreshButtonRef.current.innerText = '문제가 생겼어요';
                await delay(1000);
                refreshButtonRef.current.disabled = false;
                refreshButtonRef.current.innerText = '화면 새로고침';
                return;
            })
    };

    function wallpadReboot() {
        const refreshURL = new URL('/wallpad/reboot', `http://${location.hostname}:${backendPort}`);

        fetch(refreshURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : '')
            })
        })
            .then(res => res.json())
            .then(async body => {
                if (body.status) {
                    rebootButtonRef.current.disabled = true;
                    rebootButtonRef.current.innerText = '재시작 요청함';
                    await delay(1000);
                    signoutHandler();
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                rebootButtonRef.current.disabled = true;
                rebootButtonRef.current.innerText = '문제가 생겼어요';
                await delay(1000);
                rebootButtonRef.current.disabled = false;
                rebootButtonRef.current.innerText = '시스템 재시작';
                return;
            })
    };

    return (
        <>
            <div className='flex flex-col space-y-3'>
                <div>
                    <Label className="font-medium">
                        디스플레이 새로고침
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        설정을 변경한 후에도 디스플레이 표시 내용이 변경되지 않는 경우 원격으로 디스플레이를 새로고침할 수 있어요.
                    </p>
                    <Button
                        variant="ghost"
                        className="font-semibold mr-2 my-2 h-9 w-[7rem] bg-gray-100 hover:bg-gray-200"
                        onClick={wallpadReload}
                        ref={refreshButtonRef}>
                        화면 새로고침
                    </Button>
                </div>

                <div>
                    <Label className="font-medium">
                        시스템 재시작
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        반응 속도가 느려졌거나 조작에 응답하지 않는 경우 시스템을 재시작할 수 있어요.
                    </p>
                    <Button
                        variant="ghost"
                        className="font-semibold mr-2 my-2 h-9 w-[7rem] bg-gray-100 hover:bg-gray-200"
                        onClick={() => setIsOpenRebootDialog(true)}>
                        시스템 재시작
                    </Button>
                </div>
            </div>
            <AlertDialog open={isOpenRebootDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 시스템을 재시작할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            시스템이 종료된 후 다시 시작돼요.<br />재시작 버튼을 누르면 웹 콘솔에서 로그아웃되고 재시작이 완료되는 대로 다시 접속할 수 있어요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenRebootDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold hover:bg-red-600 hover:text-white h-9 bg-gray-100 text-black"
                            onClick={wallpadReboot}
                            ref={rebootButtonRef}>
                            시스템 재시작
                            </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function Signin({ statusCode = null }) {
    let [signinStatus, setSigninStatus] = useState(statusCode);
    const refUsername = useRef(null);
    const refPassword = useRef(null);

    const message = {
        'TOKEN_EXPIRED': '⚠️ 로그인 정보가 만료되어 로그아웃 되었어요.',
        'LOGIN_FAILED': '⚠️ 사용자 이름 또는 비밀번호를 다시 확인해 주세요.',
        'USERNAME_EMPTY': '⚠️ 사용자 이름을 입력하지 않았어요.',
        'PASSWORD_EMPTY': '⚠️ 비밀번호를 입력하지 않았어요.',
    };

    async function loginHandler(event) {
        event.preventDefault();

        if (!refUsername.current.value) {
            setSigninStatus('USERNAME_EMPTY');
            console.error('username empty.');
            return;

        } else if (!refPassword.current.value) {
            setSigninStatus('PASSWORD_EMPTY');
            console.error('password empty.');
            return;
        }

        const resp = await fetch(new URL('/wallpad/management/signin', `http://${location.hostname}:${backendPort}`).href, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: refUsername.current.value,
                password: refPassword.current.value
            })
        });

        const body = await resp.json();

        if (body.status && body.token) {
            if (typeof window !== "undefined") {
                window.localStorage.setItem(
                    'token',
                    body.token
                );
                window.location.hash = '#system';
                window.location.reload();
            }

        } else {
            setSigninStatus('LOGIN_FAILED');
            console.error('failed to login.');
        }
    }

    return (
        <>
            <main className='flex flex-col bg-accent w-[100vw] h-[100vh] justify-center items-center'>
                <Card className='flex flex-col justify-center items-center p-7 w-[370px]'>
                    <h1 className="text-2xl font-bold tracking-tight mb-5">
                        OSLab. Smart Wallpad
                    </h1>
                    <form className='flex flex-col gap-2'>
                        <Label>사용자 이름</Label>
                        <Input
                            id="username"
                            type="text"
                            className="mb-2.5"
                            ref={refUsername}
                        />
                        <Label>비밀번호</Label>
                        <Input
                            type="password"
                            ref={refPassword}
                        />
                        {(() => {
                            if (signinStatus) {
                                return (
                                    <Label className='text-sm text-red-700'>
                                        {message[signinStatus]}
                                    </Label>
                                )
                            }
                        })()}
                        <Button
                            className="w-full font-semibold my-2.5"
                            onClick={loginHandler}>
                            로그인
                        </Button>
                    </form>
                </Card>
            </main>
        </>
    )
}