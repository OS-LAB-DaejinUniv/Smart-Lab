'use client'

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, Clock, MonitorCheck, Power, RotateCcw } from 'lucide-react';

import delay from '../../utils/delay';
import { backendPort } from '../_lib/backend';
import { authFetch } from '../_lib/auth';
import { formatBackendError, formatThrownError } from '../_lib/error';

export default function SystemSection() {
    let [isOpenRebootDialog, setIsOpenRebootDialog] = useState(false);
    let [isOpenPoweroffDialog, setIsOpenPoweroffDialog] = useState(false);
    let [wallpadStatus, setWallpadStatus] = useState(false);
    let [cputemp, setCputemp] = useState(0);
    let [uptime, setUptime] = useState(0);
    const refreshButtonRef = useRef(null);
    const rebootButtonRef = useRef(null);
    const poweroffButtonRef = useRef(null);
    const restartBackendButtonRef = useRef(null);
    let [isOpenRestartBackendDialog, setIsOpenRestartBackendDialog] = useState(false);
    let [rebootError, setRebootError] = useState('');
    let [poweroffError, setPoweroffError] = useState('');
    let [restartBackendError, setRestartBackendError] = useState('');

    useEffect(() => {
        wallpadTemperature();
        wallpadUptime();
        frontendStatus();

        const tempInterval = setInterval(() => wallpadTemperature(), 5000);
        const frontendStatusInterval = setInterval(() => frontendStatus(), 5000);

        return () => {
            clearInterval(tempInterval);
            clearInterval(frontendStatusInterval);
        };
    }, []);

    function wallpadReload() {
        const refreshURL = new URL('/wallpad/refresh', `http://${location.hostname}:${backendPort}`);
        authFetch(refreshURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmcache: true })
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
            .catch(() => {
                refreshButtonRef.current.disabled = true;
                refreshButtonRef.current.innerText = '문제가 생겼어요';
                delay(1000).then(() => {
                    refreshButtonRef.current.disabled = false;
                    refreshButtonRef.current.innerText = '새로고침';
                });
            });
    }

    function wallpadReboot() {
        setRebootError('');
        const refreshURL = new URL('/wallpad/reboot', `http://${location.hostname}:${backendPort}`);
        authFetch(refreshURL, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    rebootButtonRef.current.disabled = true;
                    rebootButtonRef.current.innerText = '재시작 요청함';
                    return;
                }
                setRebootError(formatBackendError(body, '재시작에 실패했어요.'));
            })
            .catch((err) => {
                setRebootError(formatThrownError(err, '재시작에 실패했어요.'));
            });
    }

    function wallpadPoweroff() {
        setPoweroffError('');
        const poweroffURL = new URL('/wallpad/poweroff', `http://${location.hostname}:${backendPort}`);
        authFetch(poweroffURL, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    poweroffButtonRef.current.disabled = true;
                    poweroffButtonRef.current.innerText = '종료 요청함';
                    return;
                }
                setPoweroffError(formatBackendError(body, '종료에 실패했어요.'));
            })
            .catch((err) => {
                setPoweroffError(formatThrownError(err, '종료에 실패했어요.'));
            });
    }

    function wallpadRestartBackend() {
        setRestartBackendError('');
        const restartURL = new URL('/wallpad/restart-backend', `http://${location.hostname}:${backendPort}`);
        authFetch(restartURL, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setIsOpenRestartBackendDialog(false);
                    return;
                }
                setRestartBackendError(formatBackendError(body, '백엔드 재시작에 실패했어요.'));
            })
            .catch((err) => {
                setRestartBackendError(formatThrownError(err, '백엔드 재시작에 실패했어요.'));
            });
    }

    function wallpadTemperature() {
        const cputempURL = new URL('/wallpad/cputemp', `http://${location.hostname}:${backendPort}`);
        fetch(cputempURL)
            .then(res => res.json())
            .then(body => {
                if (body.temp) setCputemp(body.temp);
            })
            .catch(err => console.error('failed to retrieve cpu temperature.', err));
    }

    function frontendStatus() {
        const url = new URL('/wallpad/status', `http://${location.hostname}:${backendPort}`);
        fetch(url)
            .then(res => res.json())
            .then(body => setWallpadStatus(body.frontendConnected))
            .catch(err => console.error('failed to retrieve wallpad status.', err));
    }

    function wallpadUptime() {
        const uptimeURL = new URL('/wallpad/uptime', `http://${location.hostname}:${backendPort}`);
        fetch(uptimeURL)
            .then(res => res.json())
            .then(body => {
                if (body.uptime) setUptime(body.uptime);
            })
            .catch(err => console.error('failed to retrieve wallpad uptime.', err));
    }

    return (
        <>
            <div className='flex flex-col gap-5'>
                <div className='flex-1 flex flex-col space-y-5'>
                    <div>
                        <Label className="font-semibold text-base">가동 상태</Label>
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
                                    className={`w-full h-[.6rem] my-2 ${cputemp >= 60 ? '[&>*]:bg-red-600 bg-gray-50' : '[&>*]:bg-[#2272EB] bg-gray-50'}`}
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
                                    {`외부 디스플레이 연결${wallpadStatus ? '됨' : '되지 않음'}`}
                                    {!wallpadStatus && (
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger className='text-[#2272EB] underline underline-offset-1'> 연결하는 방법 확인하기</TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    <p>
                                                        서버를 구동중인 PC에서 웹 브라우저를 열고<br />
                                                        <span className='text-[#2272EB]'>{'http://localhost:3000 '}</span>
                                                        으로 접속하세요.
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='mt-5'>
                        <Label className="font-semibold text-base">문제가 생겼나요?</Label>
                        <div className='flex flex-col space-y-4 mt-2'>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-medium text-sm">출석부 새로고침</Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-medium h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                    onClick={wallpadReload}
                                    ref={refreshButtonRef}>
                                    실행
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-medium text-sm">시스템 재부팅</Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-medium h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
                                    onClick={() => setIsOpenRebootDialog(true)}>
                                    실행
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex flex-col">
                                    <Label className="font-medium text-sm">서비스 재시작</Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="font-medium h-9 w-full sm:w-[7rem] bg-gray-100 hover:bg-gray-200"
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
                        {restartBackendError && <p className="text-red-500 text-sm mt-2">{restartBackendError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenRestartBackendDialog(false); setRestartBackendError(''); }}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold hover:bg-red-600 hover:text-white h-9 bg-gray-100 text-black"
                            onClick={wallpadRestartBackend}
                            ref={restartBackendButtonRef}>
                            서비스 재시작
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
                        {rebootError && <p className="text-red-500 text-sm mt-2">{rebootError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenRebootDialog(false); setRebootError(''); }}>
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
                        {poweroffError && <p className="text-red-500 text-sm mt-2">{poweroffError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenPoweroffDialog(false); setPoweroffError(''); }}>
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
    );
}
