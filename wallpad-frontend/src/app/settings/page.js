'use client'

import Image from 'next/image';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect, useRef, use } from 'react';
import useHash from '../hooks/useHash';
import Profile from '../components/Profile';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import delay from '../utils/delay';
const backendPort = require('../../../package').config.socketioPort;
import './page.css';
import { IoArrowForwardOutline } from "react-icons/io5";
import { IoArrowBackOutline } from "react-icons/io5";
import { FaLock } from "react-icons/fa";
import { MdFilterListAlt } from "react-icons/md";
import { MdFilterAltOff } from "react-icons/md";

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

            case '#system':
                return <Home />;

            case '#member':
                return <Home />;

            case '#ad':
                return <Home token={currentToken} />;

            case '#card':
                return <Home />;

            case '#log':
                return <Home />;

            case '#config':
                return <Home />;

            case '#expired':
                return <Signin statusCode="TOKEN_EXPIRED" />;
        }
    }
};

function Home() {
    const signoutLeftTime = useRef(null);
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
            desc: '출퇴근 내역을 검색하고 조회할 수 있어요.'
        },
        '#config': {
            name: '환경설정',
            desc: '월패드 설정을 변경할 수 있어요.'
        },
    };

    // signout automatically when token expired.
    useEffect(() => {
        function checkToken() {
            if (typeof window !== undefined) {
                const jwt = window.localStorage.getItem('token');
                const payload = jwt.split('.')[1];
                const exp = JSON.parse(atob(payload)).exp * 1000;

                const left = exp - new Date().getTime();

                if (left <= 0) {
                    window.location.reload();

                } else {
                    signoutLeftTime.current.innerText = parseInt((left / 1000) / 60);
                }
            }
        }

        checkToken();
        const interval = setInterval(() => checkToken(), 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div className="flex flex-col items-center w-full">
                <header className="sticky flex px-7 top-0 w-full h-[3rem] z-10 max-w-screen-xl bg-blue backdrop-blur items-center border-b border-slate-300 justify-between">
                    <Label className="text-lg font-semibold">Wallpad Management Console</Label>
                    <div className="flex items-center">
                        <TooltipProvider
                            delayDuration={0}
                        >
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex items-center mr-2.5">
                                        <FaLock className="w-2.5 mr-1.5" />
                                        <p className="text-sm font-semibold">
                                            <span ref={signoutLeftTime}>30</span>분
                                        </p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>보안을 위해 시간이 지나면 자동으로 로그아웃돼요.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                        {Object.keys(hashList).map(menu => {
                            return (
                                <a
                                    key={menu}
                                    href={menu}
                                    className={`inline-flex items-center justify-left rounded-md text-sm hover:text-accent-foreground w-full h-10 px-4 py-2 font-semibold active:bg-gray-200 ` +
                                        `${hash == menu ? 'bg-accent' : 'hover:bg-accent hover:underline'}`}>
                                    {hashList[menu].name}
                                </a>
                            )
                        })}
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
                                        return <SystemSection />;

                                    case '#log':
                                        return <LogsSection />;

                                    case '#ad':
                                        return <AdsSection />;

                                    case '#card':
                                        return <SmartcardSection />;
                                }
                            })()
                        }
                    </main>
                </div>
            </div>
            <footer className="fixed flex flex-col items-left justify-center w-full h-[6rem] bottom-0 bg-gray-100">
                <div className="flex flex-col pl-[2.5rem] min-w-screen-xl">
                    <p className="font-bold text-lg text-gray-500">DJCE OS Laboratory</p>
                    <p className="font-semibold text-sm text-gray-500">소속 부원 외 본 서비스 접속을 금합니다.</p>
                </div>
            </footer>
        </>
    )
}

// contents of the section `#system`.
function SystemSection() {
    let [isOpenRebootDialog, setIsOpenRebootDialog] = useState(false);
    let [isOpenPoweroffDialog, setIsOpenPoweroffDialog] = useState(false);
    let [cputemp, setCputemp] = useState(0);
    let [uptime, setUptime] = useState(0);
    const refreshButtonRef = useRef(null);
    const rebootButtonRef = useRef(null);
    const poweroffButtonRef = useRef(null);

    // update cpu temperature every 5 seconds.
    useEffect(() => {
        wallpadTemperature();
        wallpadUptime();

        const tempInterval = setInterval(() => wallpadTemperature(), 5000);

        return () => {
            clearInterval(tempInterval);
        }
    }, []);

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
            .then(async body => {
                if (body.status) {
                    poweroffButtonRef.current.disabled = true;
                    poweroffButtonRef.current.innerText = '종료 요청함';
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                poweroffButtonRef.current.disabled = true;
                poweroffButtonRef.current.innerText = '문제가 생겼어요';
                await delay(1000);
                poweroffButtonRef.current.disabled = false;
                poweroffButtonRef.current.innerText = '시스템 종료';
                return;
            })
    };

    function wallpadTemperature() {
        const cputempURL = new URL('/wallpad/cputemp', `http://${location.hostname}:${backendPort}`);

        fetch(cputempURL)
            .then(res => res.json())
            .then(async body => {
                if (body.temp) {
                    setCputemp(body.temp);
                    return;
                }
                throw new Error();
            })
            .catch(async err => console.error('failed to retrieve cpu temperature.', err));
    };

    function wallpadUptime() {
        const uptimeURL = new URL('/wallpad/uptime', `http://${location.hostname}:${backendPort}`);

        fetch(uptimeURL)
            .then(res => res.json())
            .then(async body => {
                if (body.uptime) {
                    setUptime(body.uptime);
                    return;
                }
                throw new Error();
            })
            .catch(async err => console.error('failed to retrieve wallpad uptime.', err));
    };

    return (
        <>
            <div className='flex flex-col space-y-5'>
                <div className="flex space-x-5">
                    <div>
                        <Label className="font-medium">
                            프로세서 온도
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                            {`실시간 프로세서 온도 ${cputemp}°C`}
                        </p>
                        <Progress
                            className={
                                `w-[15rem] h-[.55rem] my-2 ` +
                                `${cputemp >= 60 ? '[&>*]:bg-red-600' : ''}`
                            }
                            value={cputemp}
                        />
                    </div>

                    <div>
                        <Label className="font-medium">
                            시스템 업타임
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                            {`시스템 시작 후 경과한 시간:\n약 ${parseInt(uptime / 3600)}시간 ${parseInt((uptime % 3600) / 60)}분`}
                        </p>
                    </div>
                </div>

                <div>
                    <Label className="font-medium">
                        디스플레이 새로고침
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        설정을 변경한 후에도 설정이 디스플레이에 적용되지 않으면 원격으로 디스플레이를 새로고침할 수 있어요.
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

                <div>
                    <Label className="font-medium">
                        시스템 종료
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        유지보수 작업 전 시스템 종료 기능을 통한 종료를 권장해요.
                    </p>
                    <Button
                        variant="ghost"
                        className="font-semibold mr-2 my-2 h-9 w-[7rem] bg-gray-100 hover:bg-gray-200"
                        onClick={() => setIsOpenPoweroffDialog(true)}>
                        시스템 종료
                    </Button>
                </div>
            </div>
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

    function updateFilter() {
        if (!filter) {
            // initialize filters
            fetchMemberList()
                .then(memberList => {
                    let name = {};
                    memberList.forEach(item =>
                        name[item.name] = true
                    );
                    setFilter({ name, datetime: {} });
                });
        }
    };

    function fetchLogs() {
        const logURL = new URL('/wallpad/management/card/history', `http://${location.hostname}:${backendPort}`);

        fetch(logURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(async body => {
                if (body.status) {
                    setLogs(body.rows);
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                console.error('failed to fetch logs', err);
                return;
            });
    };

    function fetchMemberList() {
        const url = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);

        return fetch(url, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(async body => {
                if (body.status) {
                    return body.rows;
                }
                throw new Error();
            })
            .catch(async err => {
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
            .then(async body => {
                if (body.status) {
                    setStatusCaption(body.caption);
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                console.error('failed to fetch StatusCaption', err);
                return;
            });
    }

    function resolveUUID(uuid) {
        const selectMemberURL = new URL(`/wallpad/management/member/${uuid}`, `http://${location.hostname}:${backendPort}`);

        if (UUIDName.hasOwnProperty(uuid)) {
            return UUIDName[uuid];

        } else {
            return fetch(selectMemberURL, {
                headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
            })
                .then(res => res.json())
                .then(async body => {
                    if (body.status) {
                        setUUIDName(Object.assign(UUIDName, { [uuid]: body.row.name }));
                        return body.row.name;
                    }
                    throw new Error();
                })
                .catch(async err => {
                    console.error('failed to fetch memberList', err);
                    return '??';
                });
        }
    };

    // initialize lookup section
    useEffect(() => {
        fetchStatusCaption();
        fetchLogs();
        updateFilter();
    }, []);

    return (
        <>
            <div className='flex flex-col space-y-5 pb-[7rem]'>
                <div className="flex flex-col max-w-screen-md justify-center">
                    <Table className="max-w-screen-md">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[102px] font-semibold">번호</TableHead>
                                <TableHead className="w-[132px] font-semibold">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                            이름
                                            <MdFilterListAlt className="fill-gray-500 ml-[.1rem] mt-[.15rem]" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>조회하려는 부원을 선택하세요.</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {
                                                (() => {
                                                    if (!filter?.name) return null;

                                                    return Object.keys(filter.name).map(key => (
                                                        <DropdownMenuItem
                                                            onClick={evt => evt.preventDefault()}
                                                            className="flex gap-2 items-center"
                                                            key={key}
                                                        >
                                                            <Checkbox data-state="unchecked" />
                                                            <label className="pt-[.1rem]">{key}</label>
                                                        </DropdownMenuItem>
                                                    ))
                                                })()
                                            }
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                                <TableHead className="w-[152px] font-semibold">카드 UUID</TableHead>
                                <TableHead className="w-[132px] font-semibold">변동내역</TableHead>
                                <TableHead className="w-[242px] font-semibold">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                            날짜 및 시간
                                            <MdFilterListAlt className="fill-gray-500 ml-[.1rem] mt-[.15rem]" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>조회하려는 날짜 또는 기간을 지정하세요.</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem><Input /></DropdownMenuItem>
                                            <DropdownMenuItem>
                                                dsfsd
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map(log => (
                                <TableRow key={log.index}>
                                    {/* index */}
                                    <TableCell>{log.index}</TableCell>

                                    {/* name */}
                                    <TableCell>
                                        {resolveUUID(log.uuid)}
                                    </TableCell>

                                    {/* UUID (tooltip: full UUID)  */}
                                    <TableCell>

                                        {
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <p className="font-mono text-xs bg-slate-100 rounded-md py-1 px-1.5 w-fit">
                                                            {String(log.uuid).substring(0, 7) + '..'}
                                                        </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p
                                                            onClick={() => {
                                                                if ((typeof navigator !== undefined !== typeof window)) {
                                                                    navigator.clipboard.writeText(log.uuid);
                                                                    alert('복사 완료! 이제 필요한 곳에서 붙여넣을 수 있어요.');
                                                                }
                                                            }}
                                                        >
                                                            <span
                                                                className="font-mono text-xs bg-slate-100 rounded-md py-1 px-1.5 w-fit hover:underline">
                                                                {`${log.uuid}`}
                                                            </span> (클릭하여 복사)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        }
                                    </TableCell>

                                    {/* status */}
                                    <TableCell>
                                        <p className="flex items-center gap-1">
                                            {
                                                (log.type == 1) ?
                                                    <IoArrowForwardOutline className="mb-[.1rem] stroke-red-500" /> :
                                                    <IoArrowBackOutline className="mb-[.1rem] stroke-blue-500" />
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
                    <Pagination className="max-w-screen-md mt-1">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink>1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div >
            </div >
        </>
    )
};

function SmartcardSection() {
    let [memberList, setMemberList] = useState([]);

    function fetchMembetList() {
        const memberListURL = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);

        fetch(memberListURL, {
            headers: { 'Authorization': (typeof window !== undefined ? window.localStorage.getItem('token') : '') }
        })
            .then(res => res.json())
            .then(async body => {
                if (body.status) {
                    setMemberList(body.rows);
                    return;
                }
                throw new Error();
            })
            .catch(async err => {
                console.error('failed to fetch member list', err);
                return;
            });
    };

    useEffect(() => {
        fetchMembetList();
    }, []);

    return (
        <>
            <div className='flex flex-col space-y-5'>
                <div>
                    {
                        memberList.map(member => {
                            return (
                                <p>
                                    {`${member.uuid} ${member.name}`}
                                </p>
                            )
                        })
                    }
                </div>
            </div>
        </>
    )
};

function AdsSection() {
    let [adList, setAdList] = useState([]);
    let [isOrderChanged, setIsOrderChanged] = useState(false);
    const updateOrderButtonRef = useRef(null);

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
    const onDragEnd = ({ source, destination }) => {
        try {
            console.log(`[onDragEnd] from: ${source.index} -> to: ${destination.index}`);

            // if order changed
            if (source.index !== destination.index) {
                setIsOrderChanged(true);
            }

            // change uuid order on array.
            const [fromIndex, toIndex] = [source.index, destination.index];

            if ((fromIndex == 0) && (toIndex == adList.length - 1)) {
                console.log('first -> last');

                adList.push(adList.shift());
                setAdList(adList);

            } else if ((fromIndex == adList.length - 1) && (toIndex == 0)) {
                console.log('last -> first');

                adList.unshift(adList.pop());
                setAdList(adList);

            } else {
                let tempAdUUID = adList[fromIndex];
                adList[fromIndex] = adList[toIndex];
                adList[toIndex] = tempAdUUID;
            }

        } catch (err) {
            console.error('[onDragEnd] caught an error: ', err);
        }
    };
    const updateAdOrderHandler = () => {
        try {
            fetch(updateListURL(), {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: (typeof window !== undefined ? window.localStorage.getItem('token') : ''),
                    rmcache: true,
                    adList
                })
            })
                .then(resp => resp.json())
                .then(body => {
                    if (body.status) {
                        console.log('successfully updated ad/config.json ad updated adList array.');
                        setIsOrderChanged(false);
                    }
                })

        } catch (err) {
            console.error('failed to update ad/config.json as reorderad asList array.', err);
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(new URL('/wallpad/ad/list', `http://${location.hostname}:${backendPort}`));
                const json = await res.json();

                console.log('fetched ad image list', json.list);
                setAdList(json.list);

            } catch (err) {
                console.error('failed to fetch ad list.', err);
                updateOrderButtonRef.current.disabled = true;
                updateOrderButtonRef.current.innerText = '문제가 생겼어요';

                return;
            }
        })();
    }, []);

    return (
        <>
            <div className='flex flex-col space-y-5'>
                <div>
                    <Label className="font-medium">
                        새 이미지 업로드
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        새로운 이미지를 추가할 수 있어요.<br />
                        형식 및 최대 크기: PNG, 2 MBytes<br />
                        권장 해상도: 1416x460
                    </p>
                    <div>
                        <div
                            className="flex items-center w-fit justify-between rounded-md px-1.5 my-2">
                            <input
                                type="file"
                                name="inputImage"
                                accept="image/png"
                                className="ml-2" />
                            <Button
                                type="submit"
                                variant="ghost"
                                className="font-semibold mr-2 my-2 h-9 w-[7rem] bg-slate-100 hover:bg-slate-200">
                                업로드
                            </Button>
                        </div>
                    </div>
                </div>

                <div>
                    <Label className="font-medium">
                        표시 순서 변경 및 삭제
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 text-[.8rem]">
                        표시되는 이미지의 순서를 드래그하여 변경하거나 삭제할 수 있어요.
                    </p>
                    <div className='rounded-md py-2.5 px-5 mt-2 w-fit bg-slate-100'>
                        <div
                            className={`flex bg-blue-200 items-center w-full justify-between rounded-md px-1.5 my-2 ` +
                                `${isOrderChanged ? '' : 'hidden'}`
                            }>
                            <p className="text-sm ml-2 font-semibold text-[.8rem]">
                                변경한 표시 순서를 적용할까요?
                            </p>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="font-semibold mr-2 my-2 h-9 w-[7rem] bg-slate-100 hover:bg-slate-200"
                                onClick={updateAdOrderHandler}
                                ref={updateOrderButtonRef}>
                                적용하기
                            </Button>
                        </div>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="droppable">
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className='space-y-4 py-2'>
                                        {adList.map((item, index) => (
                                            <Draggable key={item} draggableId={item} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="relative">
                                                        <div className="absolute flex right-[.7rem] top-[.6rem] space-x-1.5">
                                                            <p className="font-medium text-sm tabular-nums tracking-wider bg-[#f2f4f6] opacity-90 rounded-full py-[.04rem] px-1.5">
                                                                {`${index + 1}/${adList.length}`}
                                                            </p>
                                                            <p className="font-medium text-sm bg-[#f2f4f6] hover:bg-red-600 hover:text-gray-50 opacity-90 rounded-full py-[.04rem] px-1.5">
                                                                삭제
                                                            </p>

                                                        </div>
                                                        <Image
                                                            src={imageURL(item)}
                                                            width='420'
                                                            height='137'
                                                            className='rounded-md'
                                                            alt='ad_image'
                                                            onError={err => console.error('error occured during fetch: ', item)}
                                                            style={{
                                                                objectFit: 'fill',
                                                                width: '420px',
                                                                height: '137px'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            </div>
        </>
    )
};

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