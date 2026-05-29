'use client'

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, Clock, MonitorCheck } from 'lucide-react';

import { backendPort } from '../_lib/backend';

export default function SystemSection() {
    let [wallpadStatus, setWallpadStatus] = useState(false);
    let [cputemp, setCputemp] = useState(0);
    let [uptime, setUptime] = useState(0);

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

                </div>
            </div>
        </>
    );
}
