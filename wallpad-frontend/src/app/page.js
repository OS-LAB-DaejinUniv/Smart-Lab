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
import domtoimage from 'dom-to-image';

/**
 * Capture the <main> element as a PNG base64 string using dom-to-image.
 */
function captureMainElement(socket) {
  try {
    const mainEl = document.querySelector('main');
    if (!mainEl) {
      console.error('[Screenshot] <main> element not found');
      return;
    }

    domtoimage.toPng(mainEl, {
      quality: 1,
      width: mainEl.scrollWidth,
      height: mainEl.scrollHeight,
      style: {}
    })
      .then(base64 => {
        socket.emit('screenshotData', { image: base64 });
        console.log('[Screenshot] Captured and sent');
      })
      .catch(err => {
        console.error('[Screenshot] Capture error:', err);
      });
  } catch (err) {
    console.error('[Screenshot] Capture error:', err);
  }
}

export default function Home() {
  const [notifyStatus, setNotifyStatus] = useState({});
  const [clock, setClock] = useState('00:00:00');
  const [formattedDate, setFormattedDate] = useState('');
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

    let hasConnected = false;

    socket.on('connect', () => {
      console.log('successfully connected to socket.io server.');
      // always hide notification on connect (clears disconnect error popup)
      setNotifyLeftTime(0);
      if (hasConnected) {
        // reconnected after a disconnection — reload the page
        console.log('Reconnected to server. Reloading page...');
        location.reload();
        return;
      }
      hasConnected = true;
      socket.emit('getMemberStat');
      setSocketStatus(true);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket.IO disconnected:', reason);
      setSocketStatus(false);
      setNotifyStatus({ custom: { title: '연결이 끊어졌어요', message: '서버에 접속할 수 없어 서비스가 중단되었어요.\n연결이 재개되는 대로 자동으로 서비스를 재시작할게요.' } });
      setNotifyLeftTime(Date.now() + 60 * 60 * 1000); // keep showing for a long time until reconnect
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

    // screenshot capture handler (manual trigger from admin)
    socket.on('screenshot', () => {
      console.log('[Screenshot] Capture requested');
      captureMainElement(socket);
    });

    // auto-capture: send screenshot periodically so admin preview stays up-to-date
    const autoCaptureInterval = setInterval(() => {
      if (socket.connected) {
        captureMainElement(socket);
      }
    }, 500);

    return () => {
      clearInterval(autoCaptureInterval);
      if (socket) socket.disconnect();
    }
  }, []);
  /* ========== end socket.io setup ========== */

  // make time goes..
  useEffect(() => {
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'];

    const updateClock = () => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setClock(`${hours}:${minutes}:${seconds}`);
      setFormattedDate(`${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. (${weekDay[date.getDay()]})`);
    };

    updateClock();
    const intervalId = setInterval(updateClock, 200);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      {(() => {
        // notification window section.
        if (notifyLeftTime > 0 && Date.now() <= notifyLeftTime)
          return (
            <NotifyWindow
              type={notifyStatus.status}
              name={notifyStatus.name || null}
              timesTaken={notifyStatus.timesTaken}
              balance={notifyStatus.balance || null}
              custom={notifyStatus.custom || null}
            />
          );
      })()}
      <main className='flex flex-col p-9 justify-between bg-white rounded-2xl'>
        <section>
          {/* the section that shows logo, datetime and advertisement. */}
          <section className='flex justify-between'>
            <Image src='/logo.png' alt="Logo" width={180} height={0} />
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
                    key={`skeleton-${index}`}
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
        </section>

        <footer>
          <div className="mb-[1.65rem]">
            <p className='text-2xl font-bold mt-7 mb-3'>연구실 소식</p>
            {
              socketStatus ?
                <Advertisement /> :
                <AdvertisementSkeleton />
            }
          </div>
          <div className='flex justify-center items-center bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[8.5rem]'>
            <div className={`flex justify-center items-center rounded-full bg-[#3081F5] ` +
              `${socketStatus ? 'w-[2rem] h-[2rem] animation-pulse' : ''}`} />
            <p className='absolute font-medium align-center tracking-tight'>
              {
                socketStatus ?
                  '이곳에 ID 카드를 대주세요' :
                  '서비스를 시작하고 있어요'
              }
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
