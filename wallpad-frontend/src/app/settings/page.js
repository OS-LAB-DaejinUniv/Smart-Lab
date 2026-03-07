'use client'

import Image from 'next/image';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect, useRef } from 'react';
import useHash from '../hooks/useHash';
import Profile from '../components/Profile';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    ChevronDown, ChevronUp,
    Monitor, Users, Code, Newspaper, History, Settings,
    Lock, LogOut,
    Thermometer, Clock, MonitorCheck, HelpCircle, Wrench, RefreshCw, RotateCcw, Power, Server,
    ListFilter, ArrowRight, ArrowLeft,
    UserPlus, CreditCard, Trash2, Save,
    Upload, Menu, X as XIcon,
    Type, Timer, MessageSquare, KeyRound,
    FileCode, FilePlus, LogIn, User as UserIcon,
    Camera, Pencil, Check, X, Nfc
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox";
// Drag-and-drop removed, using arrow-based ordering instead
import delay from '../utils/delay';
const backendPort = require('../../../package').config.socketioPort;
import './page.css';
// react-icons replaced by lucide-react equivalents

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
            (() => {
                if (typeof window != 'undefined') {
                    window.location.hash = '#system';
                }
            })();
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

            case '#expired':
                return <Signin statusCode="TOKEN_EXPIRED" />;

            case '#ad':
                return <Home token={currentToken} />;

            default:
                return <Home />;

        }
    }
};

const hashList = {
    '#system': {
        name: '시스템 상태',
        desc: '시스템의 상태를 확인하거나 변경할 수 있어요.',
        icon: Monitor
    },
    '#member': {
        name: '구성원 관리',
        desc: '새로운 부원을 등록하거나 등록된 정보를 변경할 수 있어요.',
        icon: Users
    },
    '#extension': {
        name: '이벤트 리스너',
        desc: '출퇴근 이벤트에 반응하여 실행되는 스크립트를 작성할 수 있어요.',
        icon: Code
    },
    '#ad': {
        name: '연구실 소식',
        desc: '월패드에 표시되는 연구실 소식을 추가 또는 삭제할 수 있어요.',
        icon: Newspaper
    },
    '#log': {
        name: '로그 조회',
        desc: '출퇴근 내역을 검색하고 조회할 수 있어요.',
        icon: History
    },
    '#config': {
        name: '환경설정',
        desc: '월패드 설정을 변경할 수 있어요.',
        icon: Settings
    },
};

function Home() {
    const signoutLeftTime = useRef(null);
    const [renewStatus, setRenewStatus] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const rawHash = useHash();
    // 유효한 hash인지 확인하고, 아니면 기본값 '#system' 사용
    const hash = hashList[rawHash] ? rawHash : '#system';

    // Close mobile menu when hash changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [hash]);

    // signout automatically when token expired.
    useEffect(() => {
        function checkToken() {
            if (typeof window !== 'undefined') {
                try {
                    const jwt = window.localStorage.getItem('token');
                    if (!jwt) {
                        window.location.reload();
                        return;
                    }

                    const payload = jwt.split('.')[1];
                    if (!payload) {
                        window.location.reload();
                        return;
                    }

                    const exp = JSON.parse(atob(payload)).exp * 1000;
                    const left = exp - new Date().getTime();

                    if (left <= 0) {
                        window.location.reload();
                    } else if (signoutLeftTime.current) {
                        signoutLeftTime.current.innerText = parseInt((left / 1000) / 60);
                    }
                } catch (err) {
                    console.error('[checkToken] Error parsing token:', err);
                    window.location.reload();
                }
            }
        }

        checkToken();
        const interval = setInterval(() => checkToken(), 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div className="flex flex-col items-center w-full min-h-screen">
                <header className="sticky flex px-4 sm:px-7 top-0 w-full h-[3rem] z-10 max-w-screen-xl bg-white/95 backdrop-blur items-center border-b border-slate-300 justify-between">
                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-1.5 rounded-md hover:bg-gray-100"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <XIcon className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>
                    <Label className="text-base sm:text-lg font-semibold">OS Lab Smart Wallpad</Label>
                    <div className="flex items-center">
                        <TooltipProvider
                            delayDuration={0}
                        >
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="hidden sm:flex items-center mr-2.5">
                                        <p className="text-sm font-semibold">
                                            <span ref={signoutLeftTime}>30</span>분 남음
                                        </p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        보안을 위해 시간이 지나면 자동으로 로그아웃돼요.
                                        {' '}
                                        <span
                                            className='text-[#2272EB] underline underline-offset-2 cursor-pointer'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (renewStatus === 'loading') return;
                                                setRenewStatus('loading');
                                                const renewURL = new URL('/wallpad/management/token/renew', `http://${location.hostname}:${backendPort}`);
                                                fetch(renewURL, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ token: window.localStorage.getItem('token') })
                                                })
                                                    .then(res => res.json())
                                                    .then(body => {
                                                        if (body.status && body.token) {
                                                            window.localStorage.setItem('token', body.token);
                                                            setRenewStatus('success');
                                                            if (signoutLeftTime.current) signoutLeftTime.current.innerText = '30';
                                                            setTimeout(() => setRenewStatus(null), 2000);
                                                        } else throw new Error();
                                                    })
                                                    .catch(() => {
                                                        setRenewStatus('error');
                                                        setTimeout(() => setRenewStatus(null), 2000);
                                                    });
                                            }}
                                        >
                                            {renewStatus === 'loading' ? '연장 중...' : renewStatus === 'success' ? '연장 완료!' : renewStatus === 'error' ? '연장 실패' : '연장하기'}
                                        </span>
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button
                            variant="ghost"
                            className="font-semibold active:bg-gray-200 text-sm sm:text-base px-2 sm:px-4"
                            onClick={signoutHandler}>
                            로그아웃
                        </Button>
                    </div>
                </header>

                {/* Mobile navigation overlay */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/30 z-20 md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile slide-out menu */}
                <nav className={`
                    fixed top-[3rem] left-0 h-[calc(100vh-3rem)] w-64 bg-white z-30 shadow-lg transform transition-transform duration-200 ease-in-out
                    md:hidden
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="flex flex-col p-4 gap-1">
                        {Object.keys(hashList).map(menu => {
                            return (
                                <a
                                    key={menu}
                                    href={menu}
                                    className={`inline-flex items-center justify-left rounded-md text-base hover:text-accent-foreground w-full h-10 px-4 py-2 active:bg-gray-200 transition-colors duration-300 ` +
                                        `${(hash == menu) ? 'bg-accent font-semibold text-stone-950' : 'hover:bg-accent font-medium text-stone-700'}`}>
                                    {(() => { const Icon = hashList[menu].icon; return Icon ? <Icon className="w-4 h-4 mr-2.5" strokeWidth={2} /> : null; })()}
                                    {hashList[menu].name}
                                </a>
                            )
                        })}
                    </div>
                </nav>

                <div className="flex mt-4 w-full max-w-screen-xl justify-center px-4 sm:px-0">
                    {/* Desktop navigation */}
                    <nav className="hidden md:flex flex-col w-[17rem] mx-5 gap-1 flex-shrink-0">
                        {Object.keys(hashList).map(menu => {
                            return (
                                <a
                                    key={menu}
                                    href={menu}
                                    className={`inline-flex items-center justify-left rounded-md text-base hover:text-accent-foreground w-full h-10 px-4 py-2 active:bg-gray-200 transition-colors duration-300 ` +
                                        `${(hash == menu) ? 'bg-accent font-semibold text-stone-950' : 'hover:bg-accent font-medium text-stone-700'}`}>
                                    {(() => { const Icon = hashList[menu].icon; return Icon ? <Icon className="w-4 h-4 mr-2.5" strokeWidth={2} /> : null; })()}
                                    {hashList[menu].name}
                                </a>
                            )
                        })}
                    </nav>
                    <main className="w-full md:mx-5 min-w-0">
                        <h3 className="text-lg font-semibold">
                            {hashList[hash].name}
                        </h3>
                        <p className="text-sm sm:text-base font-medium text-muted-foreground mt-1 mb-5">
                            {hashList[hash].desc}
                        </p>
                        {/* <Separator className="my-4" /> */}
                        {
                            (() => {
                                switch (hash) {
                                    case '#system':
                                        return <SystemSection />;

                                    case '#log':
                                        return <LogsSection />;

                                    case '#ad':
                                        return <AdsSection />;

                                    case '#member':
                                        return <MemberSection />;

                                    case '#config':
                                        return <ConfigSection />;

                                    case '#extension':
                                        return <ExtensionSection />;
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
    let [isOpenPoweroffDialog, setIsOpenPoweroffDialog] = useState(false);
    let [wallpadStatus, setWallpadStatus] = useState(false);
    let [cputemp, setCputemp] = useState(0);
    let [uptime, setUptime] = useState(0);
    let [screenshotSrc, setScreenshotSrc] = useState(null);
    let [captureStatus, setCaptureStatus] = useState('idle');
    const refreshButtonRef = useRef(null);
    const rebootButtonRef = useRef(null);
    const poweroffButtonRef = useRef(null);
    const restartBackendButtonRef = useRef(null);
    let [isOpenRestartBackendDialog, setIsOpenRestartBackendDialog] = useState(false);

    // update cpu temperature every 5 seconds.
    useEffect(() => {
        wallpadTemperature();
        wallpadUptime();
        frontendStatus();

        const tempInterval = setInterval(() => wallpadTemperature(), 5000);
        const frontendStatusInterval = setInterval(() => frontendStatus(), 5000);

        return () => {
            clearInterval(tempInterval);
            clearInterval(frontendStatusInterval);
        }
    }, []);

    // SSE: subscribe to screenshot stream
    useEffect(() => {
        const sseURL = new URL('/wallpad/screenshot/stream', `http://${location.hostname}:${backendPort}`);
        const eventSource = new EventSource(sseURL.toString());

        eventSource.addEventListener('screenshot', (e) => {
            const data = JSON.parse(e.data);
            if (data.image) {
                setScreenshotSrc(`data:image/png;base64,${data.image}`);
            }
        });

        eventSource.onerror = () => {
            console.error('[Screenshot SSE] Connection error');
        };

        return () => eventSource.close();
    }, []);

    function triggerScreenshot() {
        const captureURL = new URL('/wallpad/screenshot/capture', `http://${location.hostname}:${backendPort}`);
        setCaptureStatus('loading');

        fetch(captureURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : '')
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setCaptureStatus('success');
                    delay(1500).then(() => setCaptureStatus('idle'));
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                setCaptureStatus('error');
                delay(1500).then(() => setCaptureStatus('idle'));
            });
    }

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
            .then(body => {
                if (body.status) {
                    refreshButtonRef.current.disabled = true;
                    refreshButtonRef.current.innerText = '성공!';
                    delay(1000).then(() => {
                        refreshButtonRef.current.disabled = false;
                        refreshButtonRef.current.innerText = '새로고침';
                    });
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                refreshButtonRef.current.disabled = true;
                refreshButtonRef.current.innerText = '문제가 생겼어요';
                delay(1000).then(() => {
                    refreshButtonRef.current.disabled = false;
                    refreshButtonRef.current.innerText = '새로고침';
                });
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
            .then(body => {
                if (body.status) {
                    rebootButtonRef.current.disabled = true;
                    rebootButtonRef.current.innerText = '재시작 요청함';
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                rebootButtonRef.current.disabled = true;
                rebootButtonRef.current.innerText = '문제가 생겼어요';
                delay(1000).then(() => {
                    rebootButtonRef.current.disabled = false;
                    rebootButtonRef.current.innerText = '시스템 재시작';
                });
            })
    };

    function wallpadPoweroff() {
        const poweroffURL = new URL('/wallpad/poweroff', `http://${location.hostname}:${backendPort}`);

        fetch(poweroffURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : '')
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    poweroffButtonRef.current.disabled = true;
                    poweroffButtonRef.current.innerText = '종료 요청함';
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                poweroffButtonRef.current.disabled = true;
                poweroffButtonRef.current.innerText = '문제가 생겼어요';
                delay(1000).then(() => {
                    poweroffButtonRef.current.disabled = false;
                    poweroffButtonRef.current.innerText = '시스템 종료';
                });
            })
    };

    function wallpadRestartBackend() {
        const restartURL = new URL('/wallpad/restart-backend', `http://${location.hostname}:${backendPort}`);

        fetch(restartURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : '')
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setIsOpenRestartBackendDialog(false);
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                restartBackendButtonRef.current.disabled = true;
                restartBackendButtonRef.current.innerText = '문제가 생겼어요';
                delay(1000).then(() => {
                    restartBackendButtonRef.current.disabled = false;
                    restartBackendButtonRef.current.innerText = '백엔드 재시작';
                });
            })
    };

    function wallpadTemperature() {
        const cputempURL = new URL('/wallpad/cputemp', `http://${location.hostname}:${backendPort}`);

        fetch(cputempURL)
            .then(res => res.json())
            .then(body => {
                if (body.temp) {
                    setCputemp(body.temp);
                    return;
                }
                throw new Error();
            })
            .catch(err => console.error('failed to retrieve cpu temperature.', err));
    };

    function frontendStatus() {
        const url = new URL('/wallpad/status', `http://${location.hostname}:${backendPort}`);

        fetch(url)
            .then(res => res.json())
            .then(body => {
                setWallpadStatus(body.frontendConnected);
            })
            .catch(err => console.error('failed to retrieve wallpad status.', err));
    };

    function wallpadUptime() {
        const uptimeURL = new URL('/wallpad/uptime', `http://${location.hostname}:${backendPort}`);

        fetch(uptimeURL)
            .then(res => res.json())
            .then(body => {
                if (body.uptime) {
                    setUptime(body.uptime);
                    return;
                }
                throw new Error();
            })
            .catch(err => console.error('failed to retrieve wallpad uptime.', err));
    };

    return (
        <>
            <div className='flex flex-col lg:flex-row gap-5 lg:gap-6'>
                {/* Left: Screenshot Preview */}
                <div className='w-full lg:w-[260px] lg:shrink-0 flex flex-col'>
                    <Label className="font-semibold text-lg mb-2">
                        디스플레이 상태
                    </Label>
                    <div className='bg-accent rounded-xl p-3 flex flex-col items-center justify-center flex-1 py-6'>
                        {screenshotSrc ? (
                            <img
                                src={screenshotSrc}
                                alt="Screenshot"
                                className='rounded-xl w-full object-contain max-h-[360px]'
                            />
                        ) : (
                            <p className='text-sm text-muted-foreground py-16'>미리보기를 가져오고 있어요</p>
                        )}
                    </div>
                </div>

                {/* Right: Existing status + troubleshooting */}
                <div className='flex-1 flex flex-col space-y-5'>
                    <div>
                        <Label className="font-semibold text-lg">
                            가동 상태
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 mt-2">
                            <div className='bg-accent p-5 rounded-xl w-full'>
                                <Label className="font-semibold text-lg">
                                    <Thermometer className="w-4 h-4 inline-block mr-1 mb-0.5" />
                                    프로세서 온도
                                </Label>
                                <p className="text-sm font-medium text-muted-foreground mt-1.5 text-lg">
                                    {`현재 온도 ${cputemp}°C`}
                                </p>
                                <Progress
                                    className={
                                        `w-full h-[.6rem] my-2 ` +
                                        `${cputemp >= 60 ? '[&>*]:bg-red-600 bg-gray-50' : '[&>*]:bg-[#2272EB] bg-gray-50'}`
                                    }
                                    value={cputemp}
                                />
                            </div>

                            <div className="bg-accent p-5 rounded-xl w-full">
                                <Label className="font-semibold text-lg">
                                    <Clock className="w-4 h-4 inline-block mr-1 mb-0.5" />
                                    시스템 가동 시간
                                </Label>
                                <p className="text-sm font-medium text-muted-foreground mt-1.5 text-[.8rem]">
                                    {`부팅 후 ${parseInt(uptime / 3600)}시간 ${parseInt((uptime % 3600) / 60)}분 경과`}
                                </p>
                            </div>

                            <div className="bg-accent p-5 rounded-xl w-full">
                                <Label className="font-semibold text-lg">
                                    <MonitorCheck className="w-4 h-4 inline-block mr-1 mb-0.5" />
                                    디스플레이 상태
                                </Label>
                                <p className='text-sm font-medium text-muted-foreground mt-1.5 text-[.8rem]'>
                                    {`외부 디스플레이 연결${(wallpadStatus) ? '됨' : '되지 않음'}`}
                                    {(!wallpadStatus) ?
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger className='text-[#2272EB] underline underline-offset-1'> 연결하는 방법 확인하기</TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    <p>
                                                        서버를 구동중인 PC에서 웹 브라우저를 열고<br />
                                                        <span className='text-[#2272EB]'>
                                                            {'http://localhost:3000 '}
                                                        </span>
                                                        으로 접속하세요.
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider> : null}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='mt-5'>
                        <Label className="font-semibold text-lg">
                            문제가 생겼나요?
                        </Label>
                        <div className='flex flex-col space-y-4 mt-2'>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-semibold text-base">
                                        출근부 화면 새로고침
                                    </Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-semibold h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                    onClick={wallpadReload}
                                    ref={refreshButtonRef}>
                                    실행
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-semibold text-base">
                                        시스템 재부팅
                                    </Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-semibold h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                    onClick={() => setIsOpenRebootDialog(true)}>
                                    실행
                                </Button>
                            </div>

                            {/* <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex flex-col">
                                <Label className="font-semibold text-base">
                                    시스템 종료
                                </Label>
                                <p className="text-sm text-muted-foreground text-[.8rem]">
                                    유지보수 작업 전 시스템 종료 기능을 통한 종료를 권장해요.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="font-semibold h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                onClick={() => setIsOpenPoweroffDialog(true)}>
                                <Power className="w-3.5 h-3.5 mr-1" />
                                시스템 종료
                            </Button>
                        </div> */}

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-semibold text-base">
                                        백엔드 재시작
                                    </Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-semibold h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                    onClick={() => setIsOpenRestartBackendDialog(true)}>
                                    실행
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <AlertDialog open={isOpenRestartBackendDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>백엔드를 재시작할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            재시작이 완료될 때까지 출근부 화면이 표시되지 않을 수 있어요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenRestartBackendDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold hover:bg-red-600 hover:text-white h-9 bg-gray-100 text-black"
                            onClick={wallpadRestartBackend}
                            ref={restartBackendButtonRef}>
                            백엔드 재시작
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isOpenRebootDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 시스템을 재시작할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            시스템을 재시작하려고 해요.<br />
                            웹 콘솔은 재시작이 완료되어야 다시 접속할 수 있어요.
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
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            시스템 재시작
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isOpenPoweroffDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 시스템을 종료할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            시스템을 종료하려고 해요.<br />
                            전원을 분리하고 다시 연결하기 전까지 자동으로 재시작되지 않아요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenPoweroffDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold hover:bg-red-600 hover:text-white h-9 bg-gray-100 text-black"
                            onClick={wallpadPoweroff}
                            ref={poweroffButtonRef}>
                            <Power className="w-3.5 h-3.5 mr-1" />
                            시스템 종료
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// contents of the section `#logs`.
function LogsSection() {
    const [logs, setLogs] = useState([]);
    const [UUIDName, setUUIDName] = useState({});
    const [statusCaption, setStatusCaption] = useState({});
    const [filter, setFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    function updateFilter() {
        if (!filter) {
            // initialize filters
            fetchMemberList()
                .then(memberList => {
                    let uuid = {};
                    memberList.forEach(item =>
                        uuid[item.uuid] = true
                    );
                    setFilter({ uuid, datetime: {} });
                });
        }
    };

    // fetch logs according to filter
    useEffect(() => {
        if (!filter) return;

        console.log('필터 설정 변경됨', filter);
        fetchLogs(filter, currentPage, pageSize);
    }, [filter, currentPage, pageSize]);

    function fetchLogs(filter, page = 1, limit = 10) {
        const logURL = new URL('/wallpad/management/card/history', `http://${location.hostname}:${backendPort}`);

        fetch(logURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : ''),
                filter,
                page,
                limit
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setLogs(body.rows);
                    if (body.pagination) {
                        setTotalPages(body.pagination.totalPages || 1);
                        setTotalItems(body.pagination.total || 0);
                    }
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch logs', err);
            });
    };

    function fetchMemberList() {
        const url = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);

        return fetch(url, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    return body.rows;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch member list', err);
            });
    };

    function fetchStatusCaption() {
        const statusCaptionURL = new URL('/wallpad/management/member/statuscaption', `http://${location.hostname}:${backendPort}`);

        fetch(statusCaptionURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusCaption(body.caption);
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch StatusCaption', err);
            });
    }

    function resolveUUID(uuid) {
        if (UUIDName.hasOwnProperty(uuid)) {
            return UUIDName[uuid];
        }

        // Return placeholder synchronously, then fetch and update state
        const selectMemberURL = new URL(`/wallpad/management/member/${uuid}`, `http://${location.hostname}:${backendPort}`);
        fetch(selectMemberURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setUUIDName(prev => ({ ...prev, [uuid]: body.row.name }));
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch memberList', err);
                setUUIDName(prev => ({ ...prev, [uuid]: '??' }));
            });

        return '...';
    };

    // initialize lookup section
    useEffect(() => {
        fetchStatusCaption();
        updateFilter();
    }, []);

    return (
        <>
            <div className='flex flex-col space-y-5 pb-[7rem]'>
                <div className="flex flex-col w-full justify-center">
                    <div className="-mx-4 sm:mx-0">
                        <Table className="w-full">
                            <TableHeader >
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[60px] sm:w-[100px] font-semibold">번호</TableHead>
                                    <TableHead className="font-semibold w-[100px]">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                                이름
                                                <ListFilter className="w-3.5 h-3.5 ml-[.2rem] mt-[.15rem] text-gray-500" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>조회하려는 부원을 선택하세요.</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {
                                                    (() => {
                                                        if (!filter?.uuid) return null;

                                                        return Object.keys(filter.uuid).map(key => (
                                                            <DropdownMenuItem
                                                                onClick={evt => evt.preventDefault()}
                                                                className="flex gap-2 items-center"
                                                                key={key}
                                                            >
                                                                <Checkbox
                                                                    data-state="unchecked"
                                                                    defaultChecked={filter.uuid[key]}
                                                                    onCheckedChange={changedStatus => {
                                                                        filter.uuid[key] = changedStatus;
                                                                        setFilter({ ...filter });
                                                                    }}
                                                                />
                                                                <label className="pt-[.1rem]">{resolveUUID(key)}</label>
                                                            </DropdownMenuItem>
                                                        ))
                                                    })()
                                                }
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableHead>
                                    <TableHead className="hidden sm:table-cell w-[140px] font-semibold">카드 UUID</TableHead>
                                    <TableHead className="w-[80px] sm:w-[120px] font-semibold">변동내역</TableHead>
                                    <TableHead className="w-auto sm:w-[200px] font-semibold">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                                <span className="hidden sm:inline">날짜 및 시간</span>
                                                <span className="sm:hidden">일시</span>
                                                <ListFilter className="w-3.5 h-3.5 ml-[.2rem] mt-[.15rem] text-gray-500" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>조회하려는 날짜 또는 기간을 지정하세요.</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem><Input /></DropdownMenuItem>
                                                <DropdownMenuItem>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log, idx) => (
                                    <TableRow key={`${log.uuid}-${log.at}`}>
                                        {/* index */}
                                        <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>

                                        {/* name */}
                                        <TableCell>
                                            {resolveUUID(log.uuid)}
                                        </TableCell>

                                        {/* UUID (tooltip: full UUID) - hidden on mobile */}
                                        <TableCell className="hidden sm:table-cell">

                                            {
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="font-mono text-xs bg-slate-100 rounded-md py-1 px-1.5 w-fit">
                                                                {String(log.uuid)}
                                                            </p>
                                                        </TooltipTrigger>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            }
                                        </TableCell>

                                        {/* status */}
                                        <TableCell>
                                            <p className="flex items-center gap-1">
                                                {
                                                    (log.type == 1) ?
                                                        <ArrowRight className="w-3.5 h-3.5 mb-[.1rem] stroke-red-500" /> :
                                                        <ArrowLeft className="w-3.5 h-3.5 mb-[.1rem] stroke-blue-500" />
                                                }
                                                <span>
                                                    {statusCaption[log.type]}
                                                </span>
                                            </p>
                                        </TableCell>

                                        {/* datetime */}
                                        < TableCell>
                                            {
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p>
                                                                {(() => {
                                                                    const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
                                                                    const t = new Date(log.at);
                                                                    return (
                                                                        <>
                                                                            {
                                                                                `${t.getMonth() + 1}월 ` +
                                                                                `${t.getDate()}일 `
                                                                            }
                                                                            <span className={(() => {
                                                                                const day = new Date(log.at).getDay();

                                                                                if (day == 0) return 'text-red-500';
                                                                                else if (day == 6) return 'text-blue-500';
                                                                            })()}>
                                                                                {`(${weekDay[t.getDay()]}) `}
                                                                            </span>
                                                                            {
                                                                                `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
                                                                            }
                                                                        </>
                                                                    );
                                                                })()}
                                                            </p>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div>
                                                                {(() => {
                                                                    const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
                                                                    const t = new Date(log.at);
                                                                    return (
                                                                        `${t.getFullYear()}년 ` +
                                                                        `${t.getMonth() + 1}월 ` +
                                                                        `${t.getDate()}일 ` +
                                                                        `${weekDay[t.getDay()]}요일 ` +
                                                                        `${String(t.getHours()).padStart(2, '0')}시 ` +
                                                                        `${String(t.getMinutes()).padStart(2, '0')}분 ` +
                                                                        `${String(t.getSeconds()).padStart(2, '0')}초`
                                                                    );
                                                                })()}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table >
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>페이지당</span>
                            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>건 · 총 {totalItems}건</span>
                        </div>
                        <Pagination className="w-auto">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                {(() => {
                                    const pages = [];
                                    const maxVisible = 5;
                                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                    let end = Math.min(totalPages, start + maxVisible - 1);
                                    if (end - start + 1 < maxVisible) {
                                        start = Math.max(1, end - maxVisible + 1);
                                    }
                                    if (start > 1) {
                                        pages.push(
                                            <PaginationItem key={1}>
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(1)}
                                                    isActive={currentPage === 1}
                                                    className={`cursor-pointer ${currentPage === 1 ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                                >1</PaginationLink>
                                            </PaginationItem>
                                        );
                                        if (start > 2) pages.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
                                    }
                                    for (let i = start; i <= end; i++) {
                                        pages.push(
                                            <PaginationItem key={i}>
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(i)}
                                                    isActive={currentPage === i}
                                                    className={`cursor-pointer ${currentPage === i ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                                >
                                                    {i}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    }
                                    if (end < totalPages) {
                                        if (end < totalPages - 1) pages.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
                                        pages.push(
                                            <PaginationItem key={totalPages}>
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    isActive={currentPage === totalPages}
                                                    className={`cursor-pointer ${currentPage === totalPages ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                                >{totalPages}</PaginationLink>
                                            </PaginationItem>
                                        );
                                    }
                                    return pages;
                                })()}
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div >
            </div >
        </>
    )
};

function MemberSection() {
    let [memberList, setMemberList] = useState([]);
    let positionText = ['부원', '랩장', '수습부원'];
    let [statusCaption, setStatusCaption] = useState([]);

    // GitHub 이미지 로드 실패를 추적하는 state
    let [githubFailedMembers, setGithubFailedMembers] = useState(new Set());

    // 각 모달의 상태를 관리하는 state
    let [isOpenNameDialog, setIsOpenNameDialog] = useState(false);
    let [isOpenCardDialog, setIsOpenCardDialog] = useState(false);
    let [isOpenNicknameDialog, setIsOpenNicknameDialog] = useState(false);
    let [isOpenPositionDialog, setIsOpenPositionDialog] = useState(false);

    // 현재 수정 중인 멤버의 정보를 저장하는 state
    let [currentMember, setCurrentMember] = useState(null);

    // 입력값을 저장하는 state
    let [newName, setNewName] = useState('');
    let [newCard, setNewCard] = useState('');
    let [newNickname, setNewNickname] = useState('');
    let [newPosition, setNewPosition] = useState('');

    // 입력값 검증 오류 메시지를 저장하는 state
    let [cardError, setCardError] = useState('');
    let [addMemberError, setAddMemberError] = useState('');

    let [addMemberName, setAddMemberName] = useState('');
    let [addMemberCard, setAddMemberCard] = useState('');
    let [addMemberNickname, setAddMemberNickname] = useState('');
    let [addMemberPosition, setAddMemberPosition] = useState('');

    let [isOpenAddMemberDialog, setIsOpenAddMemberDialog] = useState(false);
    let [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false);

    let [emojiList, setEmojiList] = useState([]);
    let [selectedEmoji, setSelectedEmoji] = useState(null);

    // Card test mode states
    let [isOpenCardTestDialog, setIsOpenCardTestDialog] = useState(false);
    let [cardTestStatus, setCardTestStatus] = useState('idle'); // 'idle' | 'waiting' | 'success' | 'error'
    let [cardTestUUID, setCardTestUUID] = useState('');
    let [cardTestError, setCardTestError] = useState('');
    let cardTestEventSourceRef = useRef(null);

    function fetchEmojiList() {
        const emojiURL = new URL(`/wallpad/emoji`, `http://${location.hostname}:${backendPort}`);
        fetch(emojiURL)
            .then(res => res.json())
            .then(body => {
                if (!body.list) throw new Error();
                setEmojiList(body.list);
            })
            .catch(err => {
                console.error('failed to fetch emoji list', err);
            });
    }

    // Start card test: connect to SSE endpoint and wait for card read
    function startCardTest() {
        setCardTestStatus('waiting');
        setCardTestUUID('');
        setCardTestError('');

        const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : '';
        const cardTestURL = new URL(`/wallpad/card/test?token=${token}`, `http://${location.hostname}:${backendPort}`);
        
        const eventSource = new EventSource(cardTestURL);
        cardTestEventSourceRef.current = eventSource;

        eventSource.addEventListener('connected', (e) => {
            console.log('[Card Test] Connected, waiting for card...');
        });

        eventSource.addEventListener('cardRead', (e) => {
            const data = JSON.parse(e.data);
            if (data.status && data.uuid) {
                setCardTestStatus('success');
                setCardTestUUID(data.uuid);
            }
            eventSource.close();
            cardTestEventSourceRef.current = null;
        });

        eventSource.addEventListener('error', (e) => {
            try {
                const data = JSON.parse(e.data);
                setCardTestError(data.reason || '카드 읽기에 실패했습니다.');
            } catch {
                setCardTestError('카드 읽기에 실패했습니다.');
            }
            setCardTestStatus('error');
            eventSource.close();
            cardTestEventSourceRef.current = null;
        });

        eventSource.onerror = () => {
            // Only set error if we haven't already received a success/error event
            if (cardTestEventSourceRef.current) {
                setCardTestStatus('error');
                setCardTestError('서버와의 연결이 끊어졌습니다.');
                eventSource.close();
                cardTestEventSourceRef.current = null;
            }
        };
    }

    // Cancel card test: close SSE connection
    function cancelCardTest() {
        if (cardTestEventSourceRef.current) {
            cardTestEventSourceRef.current.close();
            cardTestEventSourceRef.current = null;
        }
        setCardTestStatus('idle');
        setIsOpenCardTestDialog(false);
    }

    // Copy UUID to clipboard
    function copyUUIDToClipboard() {
        if (cardTestUUID && navigator.clipboard) {
            navigator.clipboard.writeText(cardTestUUID);
        }
    }

    function fetchMembetList() {
        const memberListURL = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);
        const addMemberURL = new URL('/wallpad/management/member', `http://${location.hostname}:${backendPort}`);

        fetch(memberListURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setMemberList(body.rows);
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch member list', err);
                return;
            });
    };

    function fetchStatusCaption() {
        const statusCaptionURL = new URL('/wallpad/management/member/statuscaption', `http://${location.hostname}:${backendPort}`);

        fetch(statusCaptionURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusCaption(body.caption);
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch status caption', err);
                return;
            });
    }

    useEffect(() => {
        fetchMembetList();
        fetchStatusCaption();
        fetchEmojiList();
    }, []);

    const addNewMember = () => {
        // 입력값 검증
        if (!addMemberName || !addMemberCard || !addMemberPosition) {
            setAddMemberError('모든 필수 항목을 입력하세요.');
            return;
        }

        if (!validateCardNumber(addMemberCard)) {
            setAddMemberError('카드 번호는 32자리의 16진수여야 합니다.');
            return;
        }

        const addMemberURL = new URL('/wallpad/management/member', `http://${location.hostname}:${backendPort}`);
        fetch(addMemberURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                name: addMemberName,
                uuid: addMemberCard,
                emoji: addMemberNickname || 'persevering',
                github: addMemberNickname || null,
                position: parseInt(addMemberPosition)
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    setIsOpenAddMemberDialog(false);
                    setAddMemberName('');
                    setAddMemberCard('');
                    setAddMemberNickname('');
                    setAddMemberPosition('');
                    setAddMemberError('');
                } else {
                    setAddMemberError(body.reason || '구성원 추가에 실패했습니다.');
                }
            })
            .catch(error => {
                console.error('Failed to add new member:', error);
                setAddMemberError('구성원 추가에 실패했습니다.');
            });
    };

    // 출입카드 번호 유효성 검사
    const validateCardNumber = (card) => {
        const hexRegex = /^[0-9A-Fa-f]{32}$/;
        return hexRegex.test(card);
    };

    // 멤버 상태 변경 (카드 태그와 동일: DB history 기록 + status 변경 + 프론트엔드 알림)
    const changeMemberStatus = (uuid, newStatus) => {
        const url = new URL(`/wallpad/management/member/${uuid}/status`, `http://${location.hostname}:${backendPort}`);
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                status: newStatus
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    return true;
                }
                console.error('Status change failed:', body.reason);
                return false;
            })
            .catch(err => {
                console.error('Failed to change status:', err);
                return false;
            });
    };

    // 멤버 필드 업데이트 공통 함수
    const updateMemberField = (uuid, field, value) => {
        const url = new URL(`/wallpad/management/member/${uuid}/update`, `http://${location.hostname}:${backendPort}`);
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                field,
                value
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    return true;
                }
                console.error('Update failed:', body.reason);
                return false;
            })
            .catch(err => {
                console.error(`Failed to update ${field}:`, err);
                return false;
            });
    };

    const updateName = () => {
        if (!currentMember) return;
        updateMemberField(currentMember.uuid, 'name', newName)
            .then(ok => { if (ok) setIsOpenNameDialog(false); });
    };

    const updateCard = () => {
        if (!validateCardNumber(newCard)) {
            setCardError('카드 번호는 32자리의 16진수여야 합니다.');
            return;
        }
        if (!currentMember) return;
        updateMemberField(currentMember.uuid, 'uuid', newCard)
            .then(ok => {
                if (ok) {
                    setIsOpenCardDialog(false);
                    setCardError('');
                }
            });
    };

    const saveProfile = async () => {
        if (!currentMember) return;
        let allOk = true;

        // save github field
        const githubValue = newNickname || null;
        if (githubValue !== (currentMember.github || null)) {
            const ok = await updateMemberField(currentMember.uuid, 'github', githubValue);
            if (!ok) allOk = false;
        }

        // save emoji if changed
        if (selectedEmoji) {
            const emojiName = selectedEmoji.replace('.png', '');
            const ok = await updateMemberField(currentMember.uuid, 'emoji', emojiName);
            if (!ok) allOk = false;
        }

        if (allOk) {
            setIsOpenNicknameDialog(false);
            setSelectedEmoji(null);
        }
    };

    const updatePosition = () => {
        if (!currentMember) return;
        updateMemberField(currentMember.uuid, 'position', parseInt(newPosition))
            .then(ok => { if (ok) setIsOpenPositionDialog(false); });
    };

    const deleteMember = () => {
        if (!currentMember) return;
        const url = new URL(`/wallpad/management/member/${currentMember.uuid}/delete`, `http://${location.hostname}:${backendPort}`);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.localStorage.getItem('token') })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    setIsOpenDeleteDialog(false);
                    setCurrentMember(null);
                }
            })
            .catch(err => console.error('Failed to delete member:', err));
    };

    const moveMember = (idx, direction) => {
        const newList = [...memberList];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newList.length) return;

        // swap
        [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
        setMemberList(newList);

        // persist order to backend
        const orderedUUIDs = newList.map(m => m.uuid);
        const url = new URL('/wallpad/management/member/reorder', `http://${location.hostname}:${backendPort}`);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                orderedUUIDs
            })
        }).catch(err => console.error('Failed to reorder:', err));
    };

    return (
        <>
            <div className='flex flex-col space-y-5 w-full'>
                <div className="-mx-4 sm:mx-0">
                    <table className="w-full overflow-x-auto">
                        <colgroup>
                            <col style={{ minWidth: '4.4rem' }} />
                            <col style={{ minWidth: '3.5rem', maxWidth: '10rem' }} />
                            <col style={{ minWidth: '3.5rem', maxWidth: '10rem' }} />
                            <col style={{ width: '100%' }} />
                            <col style={{ width: '2rem' }} />
                            <col style={{ minWidth: '5rem' }} />
                        </colgroup>
                        <thead>
                            <tr className='font-medium text-sm h-8'>
                                <th className='align-middle text-gray-600'>사진</th>
                                <th className='align-middle text-center text-gray-600'>직책</th>
                                <th className='align-middle text-center text-gray-600'>이름</th>
                                <th className='align-middle text-left text-gray-600 pl-3.5'>상태</th>
                                <th className='align-middle text-gray-600'>관리 메뉴</th>
                                <th className='align-middle text-gray-600'>표시 순서</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memberList.map((member, idx) => {
                                const bgColor = idx % 2 === 0 ? 'bg-accent' : '';
                                return (
                                    <tr key={member.uuid}>
                                        <td className="h-1 align-middle"> {/** Profile Picture */}
                                            <div className={`h-full rounded-l-lg flex justify-center items-center text-gray-600 ${bgColor}`}>
                                                <Image
                                                    src={(member.github && !githubFailedMembers.has(member.uuid)) ?
                                                        `https://github.com/${member.github}.png` :
                                                        `/emoji/${member.emoji}.png`
                                                    }
                                                    className="rounded-full hover:grayscale-[50%] hover:scale-95 transition-transform duration-200"
                                                    width={32}
                                                    height={32}
                                                    style={{
                                                        scale: (member.github == null || githubFailedMembers.has(member.uuid)) ?
                                                            '1.1' : '1'
                                                    }}
                                                    onClick={() => {
                                                        setCurrentMember(member);
                                                        setNewNickname(member.github || '');
                                                        setSelectedEmoji(null);
                                                        setIsOpenNicknameDialog(true);
                                                    }}
                                                    onError={() => {
                                                        if (member.github && !githubFailedMembers.has(member.uuid)) {
                                                            setGithubFailedMembers(prev => new Set([...prev, member.uuid]));
                                                        }
                                                    }}
                                                    key={idx}
                                                    alt="Profile Picture"
                                                />
                                            </div>
                                        </td>
                                        <td className="h-1 align-middle text-left"> {/** Position */}
                                            <div className={`h-full text-sm ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button className="h-6 w-[3.5rem] px-2.5 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600">
                                                            {positionText[member.position]}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-32">
                                                        <DropdownMenuRadioGroup value={member.position.toString()} onValueChange={(val) => {
                                                            updateMemberField(member.uuid, 'position', parseInt(val));
                                                        }}>
                                                            {positionText.map((text, idx) => (
                                                                <DropdownMenuRadioItem key={idx} value={idx.toString()}>
                                                                    {text}
                                                                </DropdownMenuRadioItem>
                                                            ))}
                                                        </DropdownMenuRadioGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                        <td className="h-1 align-middle text-left"> {/** Name */}
                                            <div className={`h-full text-sm px-2.5 ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                <Button className="h-6 w-[3.5rem] rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600"
                                                    onClick={() => {
                                                        setCurrentMember(member);
                                                        setNewName(member.name);
                                                        setIsOpenNameDialog(true);
                                                    }}>
                                                    {member.name}
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="h-1 align-middle text-left"> {/** Status */}
                                            <div className={`h-full text-sm ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button className="h-6 w-14 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600">
                                                            {statusCaption[member.status]}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-32">
                                                        <DropdownMenuRadioGroup value={member.status.toString()} onValueChange={(val) => {
                                                            changeMemberStatus(member.uuid, parseInt(val));
                                                        }}>
                                                            {statusCaption.map((text, idx) => (
                                                                <DropdownMenuRadioItem key={idx} value={idx.toString()}>
                                                                    {text}
                                                                </DropdownMenuRadioItem>
                                                            ))}
                                                        </DropdownMenuRadioGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                        <td className="h-1 align-middle"> {/** Modify Infos */}
                                            <div className={`h-full text-sm flex items-center justify-center font-medium ${bgColor} text-gray-600`}>
                                                <Button className="h-6 w-14 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600"
                                                    onClick={() => {
                                                        setCurrentMember(member);
                                                        setNewCard('');
                                                        setCardError('');
                                                        setIsOpenCardDialog(true);
                                                    }}>
                                                    <CreditCard className="w-3 h-3 mr-0.5" />
                                                    카드
                                                </Button>
                                                <Button className="h-6 w-14 rounded-md text-sm bg-transparent hover:bg-red-500 text-red-500 hover:text-white"
                                                    onClick={() => {
                                                        setCurrentMember(member);
                                                        setIsOpenDeleteDialog(true);
                                                    }}>
                                                    삭제
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="h-1 align-middle"> {/** Reorder Handle */}
                                            <div className={`h-full text-sm rounded-r-lg flex items-center justify-center font-medium ${bgColor}`}>
                                                <ChevronDown strokeWidth={1.6} className='stroke-slate-400 mr-1.5 cursor-pointer hover:stroke-slate-700' onClick={() => moveMember(idx, 1)} />
                                                <ChevronUp strokeWidth={1.6} className='stroke-slate-400 cursor-pointer hover:stroke-slate-700' onClick={() => moveMember(idx, -1)} />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p className="text-sm text-muted-foreground">현재 총원 {memberList.length}명</p>
                    <div className="space-x-2">
                        <Button
                            className="w-full sm:w-[8rem] h-9 bg-gray-100 hover:bg-gray-200 text-black"
                            onClick={() => setIsOpenAddMemberDialog(true)}
                        >
                            <UserPlus className="w-4 h-4 mr-1" />
                            새 구성원 추가
                        </Button>
                        <Button
                            className="w-full sm:w-[8rem] h-9 bg-gray-100 hover:bg-gray-200 text-black"
                            onClick={() => {
                                setCardTestStatus('idle');
                                setCardTestUUID('');
                                setCardTestError('');
                                setIsOpenCardTestDialog(true);
                            }}
                        >
                            <Nfc className="w-4 h-4 mr-1" />
                            ID 카드 읽기
                        </Button>
                    </div>
                </div>
            </div >

            {/* 구성원 삭제 확인 모달 */}
            <AlertDialog open={isOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>구성원 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            {currentMember ? `${currentMember.name}님을 정말 삭제할까요? 구성원을 삭제하면 해당 구성원의 출퇴근 기록도 함께 삭제됩니다.` : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                                setIsOpenDeleteDialog(false);
                                setCurrentMember(null);
                            }}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-red-500 text-white hover:bg-red-600"
                            onClick={deleteMember}>
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenAddMemberDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>새 구성원 추가</AlertDialogTitle>
                        <AlertDialogDescription>
                            새로운 구성원의 정보를 입력하세요.
                        </AlertDialogDescription>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">이름 *</label>
                                <Input
                                    value={addMemberName}
                                    onChange={(e) => setAddMemberName(e.target.value)}
                                    className="mt-1.5"
                                    placeholder="구성원 이름"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">출입카드 UUID *</label>
                                <Input
                                    value={addMemberCard}
                                    onChange={(e) => setAddMemberCard(e.target.value)}
                                    className="mt-1.5"
                                    placeholder="32자리 16진수"
                                    fontFamily="monospace"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">GitHub 닉네임</label>
                                <Input
                                    value={addMemberNickname}
                                    onChange={(e) => setAddMemberNickname(e.target.value)}
                                    className="mt-1.5"
                                    placeholder="프로필 사진을 불러올 GitHub 사용자 이름"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">직책 *</label>
                                <Select value={addMemberPosition} onValueChange={setAddMemberPosition}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="직책 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">부원</SelectItem>
                                        <SelectItem value="1">랩장</SelectItem>
                                        <SelectItem value="2">수습부원</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {addMemberError && <p className="text-red-500 text-sm">{addMemberError}</p>}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                                setIsOpenAddMemberDialog(false);
                                setAddMemberError('');
                            }}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={addNewMember}>
                            추가
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* 이름 변경 모달 */}
            <AlertDialog open={isOpenNameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>이름 변경</AlertDialogTitle>
                        <AlertDialogDescription>
                            새로운 이름을 입력하세요.
                        </AlertDialogDescription>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="mt-2"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenNameDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updateName}>
                            변경
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 출입카드 변경 모달 */}
            <AlertDialog open={isOpenCardDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>출입카드 변경</AlertDialogTitle>
                        <AlertDialogDescription>
                            새로운 출입카드 번호를 입력하세요. (32자리 16진수)
                        </AlertDialogDescription>
                        <Input
                            value={newCard}
                            onChange={(e) => setNewCard(e.target.value)}
                            className="mt-2"
                        />
                        {cardError && <p className="text-red-500 text-sm mt-1">{cardError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenCardDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updateCard}>
                            변경
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 프로필 사진 변경 모달 */}
            <AlertDialog open={isOpenNicknameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>프로필 사진 변경</AlertDialogTitle>


                        <AlertDialogDescription asChild>
                            <div>
                                <p>월패드에 기본 이모지 대신 내 GitHub 계정의 프로필 사진을 불러와 표시할 수 있어요.</p>
                                <p>둘 다 설정된 경우 GitHub 프로필 사진이 우선적으로 표시돼요.</p>
                            </div>
                        </AlertDialogDescription>
                        <p className="mt-2 text-sm">GitHub 프로필 사진 연동</p>
                        <Input
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            placeholder="GitHub 사용자 이름 등록"
                            className="mt-2 mb-2"
                        />
                        {currentMember?.github && (
                            <AlertDialogAction
                                className="font-semibold h-9 bg-red-50 text-red-600 hover:bg-red-100"
                                onClick={() => {
                                    updateMemberField(currentMember.uuid, 'github', null)
                                        .then(ok => {
                                            if (ok) {
                                                setNewNickname('');
                                                setIsOpenNicknameDialog(false);
                                            }
                                        });
                                }}>
                                삭제하고 이모지 사용
                            </AlertDialogAction>
                        )}
                        <p className="mt-2 text-sm">프로필 이모지 바꾸기</p>
                        <div className="grid grid-cols-7 gap-2 mt-2 overflow-auto h-[10rem]" style={{ scrollbarWidth: 'thin' }}>
                            {emojiList.length === 0
                                ? Array.from({ length: 21 }).map((_, idx) => (
                                    <div key={idx} className="w-8 h-8 rounded-md bg-gray-200 animate-pulse" />
                                ))
                                : emojiList.map((emoji, idx) => (
                                    <Image
                                        src={`/emoji/${emoji}`}
                                        className={`rounded-md hover:grayscale-[50%] hover:scale-95 transition-transform duration-200 cursor-pointer ${selectedEmoji === emoji ? 'ring-2 ring-blue-500' : ''}`}
                                        width={32}
                                        height={32}
                                        quality={25}
                                        key={idx}
                                        alt={`emoji-${emoji}`}
                                        onClick={() => setSelectedEmoji(emoji)}
                                    />
                                ))}
                        </div>

                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenNicknameDialog(false); setSelectedEmoji(null); }}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={saveProfile}>
                            저장
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 직책 변경 모달 */}
            <AlertDialog open={isOpenPositionDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>직책 변경</AlertDialogTitle>
                        <AlertDialogDescription>
                            새로운 직책을 선택하세요.
                        </AlertDialogDescription>
                        <Select value={newPosition} onValueChange={setNewPosition}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="직책 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">부원</SelectItem>
                                <SelectItem value="1">랩장</SelectItem>
                                <SelectItem value="2">수습부원</SelectItem>
                            </SelectContent>
                        </Select>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => setIsOpenPositionDialog(false)}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updatePosition}>
                            변경
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 카드 테스트 모달 */}
            <AlertDialog open={isOpenCardTestDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            ID 카드 읽기
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                {cardTestStatus === 'idle' && (
                                        <p>ID 카드의 식별번호를 확인할게요. 보안을 위해 OS eID 발급 서비스에서 발급받은 카드만 읽을 수 있어요.</p>
                                )}
                                {cardTestStatus === 'waiting' && (
                                    <div className="flex flex-col items-center py-6">
                                        <div className="animate-pulse">
                                            <Nfc className="w-12 h-12 text-blue-500" />
                                        </div>
                                        <p className="mt-4 text-sm">발급받은 카드를 출근부에 태그해 주세요.</p>
                                    </div>
                                )}
                                {cardTestStatus === 'success' && (
                                    <div className="flex flex-col items-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                            <Check className="w-6 h-6 text-green-600" />
                                        </div>
                                        <p className="mt-4 text-sm font-medium">카드를 성공적으로 인식했어요</p>
                                        <div className="mt-3 w-full">
                                            <Label className="text-xs text-muted-foreground">카드 식별번호는 아래와 같아요.</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="flex-1 bg-slate-100 rounded-md py-2 px-3 text-xs font-mono break-all">
                                                    {cardTestUUID}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={copyUUIDToClipboard}
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {cardTestStatus === 'error' && (
                                    <div className="flex flex-col items-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                            <XIcon className="w-6 h-6 text-red-600" />
                                        </div>
                                        <p className="mt-4 text-sm font-medium text-red-600">{cardTestError || '카드 읽기에 실패했습니다.'}</p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {cardTestStatus === 'idle' && (
                            <>
                                <AlertDialogCancel
                                    className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                                    onClick={() => setIsOpenCardTestDialog(false)}>
                                    취소
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="font-semibold border-0 h-9 bg-gray-100 text-black-500 hover:bg-gray-200"
                                    onClick={startCardTest}>
                                    시작
                                </AlertDialogAction>
                            </>
                        )}
                        {cardTestStatus === 'waiting' && (
                            <AlertDialogCancel
                                className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                                onClick={cancelCardTest}>
                                취소
                            </AlertDialogCancel>
                        )}
                        {(cardTestStatus === 'success' || cardTestStatus === 'error') && (
                            <>
                                <AlertDialogCancel
                                    className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                                    onClick={() => {
                                        setCardTestStatus('idle');
                                        setIsOpenCardTestDialog(false);
                                    }}>
                                    닫기
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="font-semibold h-9 bg-blue-500 text-white hover:bg-blue-600"
                                    onClick={() => {
                                        setCardTestStatus('idle');
                                        setCardTestUUID('');
                                        setCardTestError('');
                                    }}>
                                    다시 읽기
                                </AlertDialogAction>
                            </>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
};

function AdsSection() {
    let [adList, setAdList] = useState([]);

    // file upload states
    let [isDraggingOver, setIsDraggingOver] = useState(false);
    let [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'

    const imageURL = (id) => {
        return new URL(
            `/wallpad/ad/${id}`, `http://${location.hostname}:${backendPort}`
        ).href;
    };
    const updateListURL = () => {
        return new URL(
            `/wallpad/ad/reorder`, `http://${location.hostname}:${backendPort}`
        ).href;
    };

    const uploadImage = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setUploadStatus('error');
            setTimeout(() => setUploadStatus(null), 2000);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setUploadStatus('error');
            setTimeout(() => setUploadStatus(null), 2000);
            return;
        }
        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('inputImage', file);

        const uploadURL = new URL('/wallpad/ad/upload', `http://${location.hostname}:${backendPort}`);
        fetch(uploadURL, {
            method: 'POST',
            headers: {
                'Authorization': window.localStorage.getItem('token')
            },
            body: formData
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setUploadStatus('success');
                    fetchAdList();
                    setTimeout(() => setUploadStatus(null), 2000);
                } else {
                    throw new Error();
                }
            })
            .catch(() => {
                setUploadStatus('error');
                setTimeout(() => setUploadStatus(null), 2000);
            });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        uploadImage(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadImage(file);
        e.target.value = '';
    };

    // Apply order to backend
    const applyAdOrder = (newList) => {
        fetch(updateListURL(), {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: (typeof window !== undefined ? window.localStorage.getItem('token') : ''),
                rmcache: true,
                adList: newList
            })
        })
            .then(resp => resp.json())
            .then(body => {
                if (body.status) {
                    console.log('successfully updated ad order.');
                }
            })
            .catch(err => console.error('failed to update ad order.', err));
    };

    // Arrow-based ordering (like MemberSection) - immediate apply
    const moveAd = (idx, direction) => {
        const newList = [...adList];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newList.length) return;

        // swap
        [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
        setAdList(newList);
        applyAdOrder(newList);
    };

    const deleteAd = (adId) => {
        const deleteURL = new URL(`/wallpad/ad/remove/${adId}`, `http://${location.hostname}:${backendPort}`);
        fetch(deleteURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                rmcache: true
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchAdList();
                }
            })
            .catch(err => console.error('Failed to delete ad:', err));
    };

    useEffect(() => {
        fetchAdList();
    }, []);

    function fetchAdList() {
        fetch(new URL('/wallpad/ad/list', `http://${location.hostname}:${backendPort}`))
            .then(res => res.json())
            .then(json => setAdList(json.list))
            .catch(err => {
                console.error('failed to fetch ad list.', err);
            });
    }

    return (
        <>
            <div className='flex flex-col space-y-5'>
                <div>
                    <Label className="font-semibold text-lg mb-2">
                        새 이미지 업로드
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        새로운 이미지를 추가할 수 있어요. 권장 해상도: 1416x460
                    </p>
                    <div
                        className={`flex flex-col items-center justify-center w-full h-[8rem] mt-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                            ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => document.getElementById('adFileInput').click()}
                    >
                        <input
                            id="adFileInput"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileInput}
                        />
                        <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                        {uploadStatus === 'uploading' ? (
                            <p className="text-sm text-gray-500">업로드 중...</p>
                        ) : uploadStatus === 'success' ? (
                            <p className="text-sm text-green-600 font-medium">업로드 완료!</p>
                        ) : uploadStatus === 'error' ? (
                            <p className="text-sm text-red-600 font-medium">업로드 실패 (이미지 파일, 10MB 이하)</p>
                        ) : (
                            <p className="text-sm text-gray-500">이미지를 여기에 드래그하거나 클릭하여 선택</p>
                        )}
                    </div>
                </div>

                <div>
                    <Label className="font-semibold text-lg mb-2">
                        표시 순서 변경 및 삭제
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        화살표로 이미지의 순서를 변경하거나 삭제할 수 있어요.
                    </p>
                    <div className='rounded-md py-2.5 px-3 sm:px-5 mt-2 w-full max-w-[28rem] bg-slate-100'>
                        <div className='space-y-4 py-2'>
                            {adList.map((item, index) => (
                                <div key={item} className="relative flex items-center gap-2">
                                    <div className="flex flex-col">
                                        <ChevronUp
                                            strokeWidth={1.6}
                                            className='stroke-slate-400 cursor-pointer hover:stroke-slate-700 w-5 h-5'
                                            onClick={() => moveAd(index, -1)}
                                        />
                                        <ChevronDown
                                            strokeWidth={1.6}
                                            className='stroke-slate-400 cursor-pointer hover:stroke-slate-700 w-5 h-5'
                                            onClick={() => moveAd(index, 1)}
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <div className="absolute flex right-[.5rem] top-[.5rem] space-x-1.5">
                                            <p className="font-medium text-sm tabular-nums tracking-wider bg-[#f2f4f6] opacity-90 rounded-full py-[.04rem] px-1.5">
                                                {`${index + 1}/${adList.length}`}
                                            </p>
                                            <p
                                                className="font-medium text-sm bg-[#f2f4f6] hover:bg-red-600 hover:text-gray-50 opacity-90 rounded-full py-[.04rem] px-2 cursor-pointer"
                                                onClick={() => deleteAd(item)}
                                            >
                                                삭제
                                            </p>
                                        </div>
                                        <img
                                            src={imageURL(item)}
                                            className='rounded-md w-full'
                                            alt='ad_image'
                                            onError={() => console.error('error occured during fetch: ', item)}
                                            style={{
                                                objectFit: 'cover',
                                                maxWidth: '100%',
                                                height: 'auto',
                                                aspectRatio: '1416/460'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
};

function ConfigSection() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [adTransitionRate, setAdTransitionRate] = useState(8000);
    const [memberStatusCaption, setMemberStatusCaption] = useState(['', '', '']);
    const [arduinoDeviceSerial, setArduinoDeviceSerial] = useState('');

    // 비밀번호 변경 모달 관련 state
    const [isOpenPasswordDialog, setIsOpenPasswordDialog] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    function fetchConfig() {
        const url = new URL('/wallpad/config/public', `http://${location.hostname}:${backendPort}`);
        fetch(url)
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setConfig(body);
                    setTitle(body.title || '');
                    setAdTransitionRate(body.adTransitionRate || 8000);
                    setMemberStatusCaption(body.memberStatusCaption || ['부재중', '재실', '수업', '자리비움', '휴학']);
                    setArduinoDeviceSerial(body.arduinoDeviceSerial || '');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch config:', err);
                setLoading(false);
            });
    }

    function saveConfig() {
        setSaving(true);
        const url = new URL('/wallpad/management/config', `http://${location.hostname}:${backendPort}`);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                title,
                adTransitionRate: parseInt(adTransitionRate),
                memberStatusCaption,
                arduinoDeviceSerial
            })
        })
            .then(res => res.json())
            .then(body => {
                setSaving(false);
                if (body.status) {
                    alert('설정이 저장되었습니다.');
                } else {
                    alert('설정 저장에 실패했습니다.');
                }
            })
            .catch(err => {
                setSaving(false);
                console.error('Failed to save config:', err);
                alert('설정 저장에 실패했습니다.');
            });
    }

    function changePassword() {
        setPasswordError('');

        if (!currentPassword) {
            setPasswordError('현재 비밀번호를 입력해주세요.');
            return;
        }
        if (!newUsername && !newPassword) {
            setPasswordError('새 아이디 또는 새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword && newPassword !== newPasswordConfirm) {
            setPasswordError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        setPasswordSaving(true);
        const url = new URL('/wallpad/management/password/change', `http://${location.hostname}:${backendPort}`);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: window.localStorage.getItem('token'),
                currentPassword,
                newUsername: newUsername || undefined,
                newPassword: newPassword || undefined
            })
        })
            .then(res => res.json())
            .then(body => {
                setPasswordSaving(false);
                if (body.status) {
                    alert('계정 정보가 변경되었습니다. 다시 로그인해주세요.');
                    window.localStorage.removeItem('token');
                    window.location.reload();
                } else {
                    setPasswordError(body.message || '계정 변경에 실패했습니다.');
                }
            })
            .catch(err => {
                setPasswordSaving(false);
                console.error('Failed to change password:', err);
                setPasswordError('계정 변경에 실패했습니다.');
            });
    }

    function openPasswordDialog() {
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setPasswordError('');
        setIsOpenPasswordDialog(true);
    }

    if (loading) {
        return <div className="text-center py-8 text-gray-500">설정을 불러오는 중...</div>;
    }

    return (
        <div className="flex flex-col space-y-6 w-full max-w-xl">
            <div>
                <Label className="text-sm font-medium"><Type className="w-3.5 h-3.5 inline mr-1 mb-0.5" />월패드 제목</Label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2"
                    placeholder="연구실 이름"
                />
                <p className="text-xs text-muted-foreground mt-1">메인 화면에 표시되는 연구실 이름입니다.</p>
            </div>

            <div>
                <Label className="text-sm font-medium"><Timer className="w-3.5 h-3.5 inline mr-1 mb-0.5" />광고 전환 주기 (ms)</Label>
                <Input
                    type="number"
                    value={adTransitionRate}
                    onChange={(e) => setAdTransitionRate(e.target.value)}
                    className="mt-2"
                    min={1000}
                    max={60000}
                    step={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">연구실 소식 이미지가 전환되는 주기입니다. (1000ms = 1초)</p>
            </div>

            <div>
                <Label className="text-sm font-medium"><Server className="w-3.5 h-3.5 inline mr-1 mb-0.5" />ID 카드 리더기 일련번호</Label>
                <Input
                    value={arduinoDeviceSerial}
                    onChange={(e) => setArduinoDeviceSerial(e.target.value)}
                    className="mt-2 font-mono"
                    placeholder="20자리 16진수 값"
                />
                <p className="text-xs text-muted-foreground mt-1">변경 후 백엔드 재시작이 필요합니다.</p>
            </div>

            <Separator />

            <div>
                <Label className="text-sm font-medium"><KeyRound className="w-3.5 h-3.5 inline mr-1 mb-0.5" />관리자 계정 변경</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">관리자 아이디 또는 비밀번호를 변경합니다.</p>
                <Button
                    variant="outline"
                    onClick={openPasswordDialog}
                    className="w-40"
                >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    계정 변경
                </Button>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={saveConfig}
                    disabled={saving}
                    className="w-32"
                >
                    {saving ? '저장 중...' : '설정 저장'}
                </Button>
            </div>

            {/* 비밀번호 변경 모달 */}
            <AlertDialog open={isOpenPasswordDialog} onOpenChange={setIsOpenPasswordDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>관리자 계정 변경</AlertDialogTitle>
                        <AlertDialogDescription>
                            아이디 또는 비밀번호를 변경합니다. 변경 후 다시 로그인해야 합니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-sm font-medium">현재 비밀번호 *</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="현재 비밀번호 입력"
                                className="mt-1"
                            />
                        </div>
                        <Separator />
                        <div>
                            <Label className="text-sm font-medium">새 아이디</Label>
                            <Input
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="변경할 아이디 (선택)"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">새 비밀번호</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="변경할 비밀번호 (선택)"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">새 비밀번호 확인</Label>
                            <Input
                                type="password"
                                value={newPasswordConfirm}
                                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                placeholder="새 비밀번호 다시 입력"
                                className="mt-1"
                            />
                        </div>
                        {passwordError && (
                            <p className="text-sm text-red-500">{passwordError}</p>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={passwordSaving}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={changePassword} disabled={passwordSaving}>
                            {passwordSaving ? '변경 중...' : '변경'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// contents of the section `#extension`.
function ExtensionSection() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [code, setCode] = useState('');
    const [originalCode, setOriginalCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [isNewFile, setIsNewFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [renamingFile, setRenamingFile] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const DEFAULT_TEMPLATE = `const Extension = require("../Extension");\nmodule.exports = new Extension({\n    enabled: true,\n    activatedStatus: 1,\n    activatedIndex: '*'\n},\n    (userInfo, changedTo, memberList) => {\n     // 이곳에 이벤트 리스너 함수를 구현하세요.\n    }\n);\n`;

    const baseURL = `http://${location.hostname}:${backendPort}`;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : '';

    function fetchFileList() {
        const url = new URL('/wallpad/management/extension/list', baseURL);
        fetch(url, {
            headers: { 'Authorization': token }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setFiles(body.files);
                }
            })
            .catch(err => console.error('[ExtensionSection] Failed to fetch file list:', err));
    }

    useEffect(() => {
        fetchFileList();
    }, []);

    function openFile(filename) {
        setLoading(true);
        setStatusMsg(null);
        setIsNewFile(false);
        setNewFileName('');
        const url = new URL(`/wallpad/management/extension/read/${encodeURIComponent(filename)}`, baseURL);
        fetch(url, {
            headers: { 'Authorization': token }
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setSelectedFile(filename);
                    setCode(body.content);
                    setOriginalCode(body.content);
                } else {
                    setStatusMsg('파일을 불러올 수 없어요.');
                }
            })
            .catch(() => setStatusMsg('파일을 불러올 수 없어요.'))
            .finally(() => setLoading(false));
    }

    function saveFile() {
        const filename = isNewFile ? newFileName : selectedFile;
        if (!filename) return;

        if (isNewFile && !filename.endsWith('.js')) {
            setStatusMsg('파일 이름은 .js로 끝나야 해요.');
            return;
        }

        setSaving(true);
        setStatusMsg(null);
        const url = new URL('/wallpad/management/extension/save', baseURL);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, filename, content: code })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg('저장되었어요.');
                    setOriginalCode(code);
                    if (isNewFile) {
                        setIsNewFile(false);
                        setSelectedFile(filename);
                        setNewFileName('');
                        fetchFileList();
                    }
                } else {
                    setStatusMsg('저장에 실패했어요: ' + (body.reason || ''));
                }
            })
            .catch(() => setStatusMsg('저장에 실패했어요.'))
            .finally(() => setSaving(false));
    }

    function deleteFile() {
        if (!selectedFile) return;
        setDeleting(true);
        setStatusMsg(null);
        const url = new URL('/wallpad/management/extension/delete', baseURL);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, filename: selectedFile })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg('삭제되었어요.');
                    setSelectedFile(null);
                    setCode('');
                    setOriginalCode('');
                    fetchFileList();
                } else {
                    setStatusMsg('삭제에 실패했어요.');
                }
            })
            .catch(() => setStatusMsg('삭제에 실패했어요.'))
            .finally(() => {
                setDeleting(false);
                setShowDeleteDialog(false);
            });
    }

    function startNewFile() {
        setIsNewFile(true);
        setSelectedFile(null);
        setNewFileName('');
        setCode(DEFAULT_TEMPLATE);
        setOriginalCode(DEFAULT_TEMPLATE);
        setStatusMsg(null);
        setRenamingFile(null);
    }

    function startRename(filename) {
        setRenamingFile(filename);
        setRenameValue(filename);
    }

    function confirmRename(oldFilename) {
        const newFilename = renameValue.trim();
        if (!newFilename || newFilename === oldFilename) {
            setRenamingFile(null);
            return;
        }
        if (!newFilename.endsWith('.js')) {
            setStatusMsg('파일 이름은 .js로 끝나야 해요.');
            return;
        }
        setStatusMsg(null);
        const url = new URL('/wallpad/management/extension/rename', baseURL);
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, oldFilename, newFilename })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg('파일 이름이 변경되었어요.');
                    if (selectedFile === oldFilename) {
                        setSelectedFile(newFilename);
                    }
                    fetchFileList();
                } else {
                    setStatusMsg('이름 변경에 실패했어요: ' + (body.reason || ''));
                }
            })
            .catch(() => setStatusMsg('이름 변경에 실패했어요.'))
            .finally(() => setRenamingFile(null));
    }

    const hasUnsavedChanges = code !== originalCode;

    const highlightCode = (code) => {
        if (typeof window !== 'undefined') {
            const Prism = require('prismjs');
            require('prismjs/components/prism-javascript');
            return Prism.highlight(code, Prism.languages.javascript, 'javascript');
        }
        return code;
    };

    const Editor = typeof window !== 'undefined' ? require('react-simple-code-editor').default : null;

    return (
        <div>
            {/* file list and new file button */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Label className="text-sm font-semibold mr-1"><FileCode className="w-3.5 h-3.5 inline mr-1 mb-0.5" />스크립트 파일</Label>
                {files.map(f => (
                    renamingFile === f ? (
                        <div key={f} className="flex items-center gap-1">
                            <Input
                                className="h-7 text-xs font-mono w-[12rem]"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmRename(f);
                                    if (e.key === 'Escape') setRenamingFile(null);
                                }}
                                autoFocus
                            />
                            <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => confirmRename(f)} title="확인">
                                <Check className="w-3.5 h-3.5 text-green-600" />
                            </button>
                            <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => setRenamingFile(null)} title="취소">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                    ) : (
                        <div key={f} className="flex items-center gap-0.5">
                            <Button
                                variant={selectedFile === f && !isNewFile ? 'default' : 'outline'}
                                size="sm"
                                className="text-xs"
                                onClick={() => openFile(f)}
                            >
                                {f}
                            </Button>
                            <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => startRename(f)} title="이름 변경">
                                <Pencil className="w-3 h-3 text-gray-400" />
                            </button>
                        </div>
                    )
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-dashed"
                    onClick={startNewFile}
                >
                    <FilePlus className="w-3.5 h-3.5 mr-1" />
                    새 파일
                </Button>
            </div>

            {/* new file name input */}
            {isNewFile && (
                <div className="flex items-center gap-2 mb-4">
                    <Label className="text-sm font-medium whitespace-nowrap">파일 이름</Label>
                    <Input
                        className="max-w-[18rem] text-sm font-mono"
                        placeholder="MyExtension.js"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                    />
                </div>
            )}

            {/* code editor */}
            {(selectedFile || isNewFile) && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">
                            {isNewFile ? (newFileName || '새 파일') : selectedFile}
                            {hasUnsavedChanges && <span className="text-orange-500 ml-1">●</span>}
                        </Label>
                        <div className="flex gap-3 items-center">
                            {!isNewFile && selectedFile && (
                                <button
                                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    삭제
                                </button>
                            )}
                            <button
                                className="text-xs text-black hover:underline disabled:opacity-50"
                                onClick={saveFile}
                                disabled={saving || (isNewFile && !newFileName)}
                            >
                                {saving ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-md overflow-hidden" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        {Editor && (
                            <Editor
                                value={code}
                                onValueChange={setCode}
                                highlight={highlightCode}
                                padding={12}
                                style={{
                                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                                    fontSize: 13,
                                    minHeight: '20rem',
                                    backgroundColor: '#fafafa',
                                    lineHeight: '1.5',
                                }}
                                textareaClassName="code-editor-textarea"
                                preClassName="code-editor-pre"
                            />
                        )}
                    </div>
                </div>
            )}

            {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

            {statusMsg && (
                <p className="text-sm font-medium mt-2" style={{ color: statusMsg.includes('실패') || statusMsg.includes('없') ? '#dc2626' : '#16a34a' }}>
                    {statusMsg}
                </p>
            )}

            {/* delete confirmation dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>파일 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{selectedFile}</strong> 파일을 삭제하시겠어요? 삭제된 파일은 복구할 수 없어요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteFile} disabled={deleting}>
                            {deleting ? '삭제 중...' : '삭제'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function Signin({ statusCode = null }) {
    let [signinStatus, setSigninStatus] = useState(statusCode);
    const refUsername = useRef(null);
    const refPassword = useRef(null);

    const message = {
        'TOKEN_EXPIRED': '로그인 정보가 만료되어 로그아웃 되었어요.',
        'LOGIN_FAILED': '사용자 이름 또는 비밀번호를 다시 확인해 주세요.',
        'USERNAME_EMPTY': '사용자 이름을 입력하지 않았어요.',
        'PASSWORD_EMPTY': '비밀번호를 입력하지 않았어요.',
    };

    function loginHandler(event) {
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

        fetch(new URL('/wallpad/management/signin', `http://${location.hostname}:${backendPort}`).href, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: refUsername.current.value,
                password: refPassword.current.value
            })
        })
            .then(resp => resp.json())
            .then(body => {
                if (body.status && body.token) {
                    if (typeof window !== "undefined") {
                        window.localStorage.setItem('token', body.token);
                        window.location.hash = '#system';
                        window.location.reload();
                    }
                }
                else {
                    setSigninStatus('LOGIN_FAILED');
                    console.error('failed to login.');
                }
            }
            )
            .catch(err => {
                setSigninStatus('LOGIN_FAILED');
                console.error('failed to login.', err);
            });
    }

    return (
        <>
            <main className='flex flex-col bg-accent w-[100vw] h-[100vh] justify-center items-center'>
                <Card className='flex flex-col justify-center items-center p-7 w-[370px]'>
                    <h1 className="text-2xl font-bold tracking-tight mb-5">
                        OS Lab Smart Wallpad
                    </h1>
                    <form className='flex flex-col gap-2'>
                        <Label><UserIcon className="w-3.5 h-3.5 inline mr-1 mb-0.5" />사용자 이름</Label>
                        <Input
                            id="username"
                            type="text"
                            className="mb-2.5"
                            ref={refUsername}
                        />
                        <Label><Lock className="w-3.5 h-3.5 inline mr-1 mb-0.5" />비밀번호</Label>
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