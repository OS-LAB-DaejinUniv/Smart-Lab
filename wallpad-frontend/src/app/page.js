'use client'

import packageJSON from '../../package';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import Profile from './components/Profile';
import ProfileSkeleton from './components/ProfileSkeleton';
import NotifyWindow from './components/NotifyWindow';
import Advertisement from './components/Advertisement';
import AdvertisementSkeleton from './components/AdvertisementSkeleton';
import io from 'socket.io-client';

export default function Home() {
  const [notifyStatus, setNotifyStatus] = useState({});
  const [clock, setClock] = useState('00:00:00');
  let [notifyLeftTime, setNotifyLeftTime] = useState(0);
  let [socketStatus, setSocketStatus] = useState(false);
  let socket = null;

  // state variable which has current member object array to show.
  let [memberStatus, setMemberStatus] = useState(Array(9).fill({
    isSkeleton: true
  }));

  const showNotification = (duration) => {
    setNotifyLeftTime(
      new Date().getTime() + duration
    );
  };

  /* ========== start socket.io setup ========== */
  useEffect(() => {
    socket = io(packageJSON.config.socketio, {
      cors: {
        origin: "http://localhost:5000",
        methods: ["GET", "POST"]
      }
    });

    socket.on('connect', () => {
      console.log('successfully connected to socket.io server.');
      socket.emit('getMemberStat');
      setSocketStatus(true);
    });

    socket.on('success', data => {
      console.log(`[SCEvent] duration: ${data.duration}, name: ${data.name}, status: ${data.status}`);
      socket.emit('getMemberStat');
      setNotifyStatus(data);
      showNotification(data.duration);
    });

    socket.on('error', error => {
      console.error(`[SCEvent] duration: ${error.duration}, name: ${error.name}, status: ${error.status}`);
      setNotifyStatus(error);
      showNotification(error.duration);
    });

    socket.on('getMemberStatResp', userData => {
      console.log(userData);
      setMemberStatus(userData);
    });

    socket.on('reqFrontendRefresh', () => {
      console.log('Page is being refreshed now..');
      location.reload();
    });

    return () => {
      if (socket) socket.disconnect();
    }
  }, []);
  /* ========== end socket.io setup ========== */

  // make time goes..
  setInterval(() => {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    setClock(`${hours}:${minutes}:${seconds}`);
  }, 200);

  // retrieve current date.
  const today = new Date();
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}. (${weekDay[today.getDay()]})`;

  return (
    <>
      {(() => {
        // notification window section.
        if (new Date().getTime() <= notifyLeftTime)
          return (
            <NotifyWindow
              type={notifyStatus.status}
              name={notifyStatus.name || null}
              timesTaken={notifyStatus.timesTaken}
            />
          );
      })()}
      <main className='flex flex-col p-9 justify-between bg-white rounded-2xl'>
        <section>
          {/* the section that shows logo, datetime and advertisement. */}
          <section className='flex justify-between'>
            <Image src='/logo.png' width={180} height={0} />
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
                if (user.isSkeleton) return (
                  <ProfileSkeleton
                    key={`${Math.random()}`}
                  />
                )

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
          {
            socketStatus ? <Advertisement /> : <AdvertisementSkeleton />
          }
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
                    '시작하는 동안 잠시만 기다려 주세요'
                })()
              }
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}