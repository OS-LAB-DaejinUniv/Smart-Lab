'use client'

import packageJSON from '../../package';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import Profile from './components/Profile';
import ProfileSkeleton from './components/ProfileSkeleton';
import NotifyWindow from './components/NotifyWindow';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import io from 'socket.io-client';

export default function Home() {
  const [notifyStatus, setNotifyStatus] = useState({});
  let [notifyLeftTime, setNotifyLeftTime] = useState(0);
  let [socketStatus, setSocketStatus] = useState(false);
  const transitionRate = 8000;
  let socket = null;

  const adPagesMax = 2;
  let [currentAdPage, setCurrentAdPage] = useState(1);

  // state variable which has current member object array to show.
  let [memberStatus, setMemberStatus] = useState(Array(9).fill({
    isSkeleton: true
  }));

  // notification windows lasts as much as the value of `duration` property of the event SCEvent object defines.
  useEffect(() => {
    console.log('noti_left ' + notifyLeftTime);

    if (notifyLeftTime > 0) {
      setTimeout(() => {
        setNotifyLeftTime(0);
        console.log('noti_decreased ' + notifyLeftTime);
      }, notifyLeftTime);
    }

  }, [notifyLeftTime]);

  /* ========== start socket.io setup ========== */
  useEffect(() => {
    socket = io(packageJSON.config.socketio, {
      cors: {
        origin: "http://localhost:5000",
        methods: ["GET", "POST"]
      }
    });

    socket.on('connect', () => setSocketStatus(true));

    socket.on('success', data => {
      console.log(`[SCEvent] duration: ${data.duration}, name: ${data.name}, status: ${data.status}`);
      socket.emit('getMemberStat');
      setNotifyStatus(data);
      setNotifyLeftTime(notifyLeftTime + data.duration);

    });

    socket.on('error', error => {
      console.error(`[SCEvent] duration: ${error.duration}, name: ${error.name}, status: ${error.status}`);
      setNotifyStatus(error);
      setNotifyLeftTime(notifyLeftTime + error.duration);
    });

    socket.on('getMemberStatResp', (userData) => {
      console.log(userData);
      setMemberStatus(userData);
    });

    socket.emit('getMemberStat');

    return () => {
      if (socket) socket.disconnect();
    }
  }, []);
  /* ========== end socket.io setup ========== */

  // make ad image to be changed automatically. 
  useEffect(() => {
    const interval = setInterval(() => {
      currentAdPage < adPagesMax
        ? setCurrentAdPage(currentAdPage + 1)
        : setCurrentAdPage(1);
    }, transitionRate)

    return () => clearInterval(interval)
  }, [currentAdPage, adPagesMax])

  // retrieve current time.
  const [clock, setClock] = useState('00:00:00');

  // make time goes..
  setInterval(() => {
    const date = new Date();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    setClock(`${hours}:${minutes}:${seconds}`);
  }, 200);

  // retrieve current date.
  const today = new Date();
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}. (${weekDay[today.getDay()]
    })`

  return (
    <>
      {(() => {
        // notification window section.
        if (notifyLeftTime > 0)
          return (
            <NotifyWindow
              type={notifyStatus.status}
              name={notifyStatus.name || null}
            />
          );
      })()}
      <main className='flex flex-col p-9 justify-between bg-white rounded-2xl'>
        <section>
          {/* the section that shows logo, datetime and advertisement. */}
          <section className='flex justify-between'>
            <Image src='/logo.png' width={185} height={0} />
            <div className='flex flex-col items-end'>
              <p className={'text-xl font-semibold tabular-nums'}>
                {(() => `${clock}`)()}
              </p>
              <p className={'text-sm font-semibold text-[#5E636B]'}>
                {(() => formattedDate)()}
              </p>
            </div>
          </section>
          <p className='text-2xl font-bold mt-7 mb-3'>
            {packageJSON.config.title}
          </p>
          <div className='flex flex-wrap justify-start gap-4'>
            {/* the section that shows member profile. */}
            {(() => {
              if (!Array.isArray(memberStatus)) {
                console.error("memberStatus is not an array", memberStatus);
                return null;
              }

              return memberStatus.map((user, index) => {
                if (user.isSkeleton) return <ProfileSkeleton />

                return (
                  <Profile
                    name={user.name}
                    position={user.position}
                    status={user.status}
                    emoji={user.emoji}
                    github={user.github}
                    isAbsent={user.status != 1}
                    key={index}
                    isSkeleton={user.isSkeleton}
                  />
                )
              })
            })()}
          </div>

          <p className='text-2xl font-bold mt-7 mb-3'>연구실 소식</p>
          <div className='flex justify-center items-center bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[9.5rem]'>
            <Image
              src={`/ad/ad${currentAdPage}.png`}
              width='1366'
              height='0'
              alt='ad'
            />
          </div>
        </section>

        <footer>
          <div className='flex justify-center items-center bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[8.5rem]'>
            <div className={`flex justify-center items-center rounded-full bg-[#3081F5] ` +
              `${socketStatus ? 'w-[2rem] h-[2rem] animation-pulse' : ''}`} />
            <p className='absolute font-medium align-center tracking-tight'>
              {
                (() => {
                  return socketStatus ?
                    '이곳에 ID 카드를 대주세요' :
                    '서비스가 시작되는 동안 잠시 기다려 주세요'
                })()
              }
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
