'use client'

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Profile from '../components/Profile';
import ProfileSkeleton from '../components/ProfileSkeleton';
import Advertisement from '../components/Advertisement';
import AdvertisementSkeleton from '../components/AdvertisementSkeleton';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
const backendPort = require('../../../package').config.socketioPort;
import './page.css';

function Main() {
    return (
        <Card className='flex flex-col'>
            <CardTitle>Main</CardTitle>
            <form>
                <Input type="text" />
                <Input type="password" />
                <Button>로그인</Button>
            </form>
        </Card>
    )
}

export default function Login() {
    const inputUsernameRef = useRef(null);
    const inputPasswordRef = useRef(null);

    async function loginHandler(event) {
        event.preventDefault();

        const resp = await fetch(new URL('/wallpad/managment/signin', `http://${location.hostname}:${backendPort}`).href, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: inputUsernameRef.current.value,
                password: inputPasswordRef.current.value
            })
        });

        const json = await resp.json();

        console.log('로그인 결과', resp);
    }

    return (
        <>
            <main className='flex flex-col bg-accent w-[100vw] h-[100vh] justify-center items-center'>
                <Card className='flex flex-col justify-center items-center p-7 w-[370px]'>
                    <h1 class="text-2xl font-bold tracking-tight mb-4">
                        OSLab. Smart Wallpad
                    </h1>
                    <form className='flex flex-col gap-2'>
                        <Label>사용자 이름</Label>
                        <Input
                            id="username"
                            type="text"
                            ref={inputUsernameRef}
                        />
                        <Label>비밀번호</Label>
                        <Input
                            type="password"
                            ref={inputPasswordRef}
                        />
                        <Button
                            className="w-full font-semibold my-2.5"
                            onClick={loginHandler}
                        >
                            로그인
                        </Button>
                    </form>
                </Card>
            </main>
        </>
    )
}
