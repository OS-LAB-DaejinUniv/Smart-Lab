'use client'

import Image from 'next/image'
import React, { useState, useRef, useEffect } from 'react'
import Profile from './components/Profile'
import NotifyWindow from './components/NotifyWindow'
import io from 'socket.io-client'

export default function Home() {
  const audioRef = useRef();
  const audioSourceRef = useRef();
  const [notifyStatus, setNotifyStatus] = useState({});
  const transitionRate = 8000;
  let socket;

  const adPagesMax = 2;
  let [currentAdPage, setCurrentAdPage] = useState(1);

  /* socket.io setup */
  useEffect(() => {
    socket = io('http://localhost:5000', {
      cors: {
        origin: "http://localhost:5000",
        methods: ["GET", "POST"]
      }
    });

    socket.on('success', (data) => {
      console.log(`[SCEvent] eventFired: ${data.eventFired}, name: ${data.name}, status: ${data.status}`);
      setNotifyStatus(data);
    });

    socket.on('error', (err) => {
      switch (err.why) {
        case 'unsupported':
          console.error('지원하지 않는 카드입니다.');
          break;
        case 'invalidCrypto':
          console.error('스마트카드가 올바르게 발급되지 않았습니다. 부원인 경우 관리자에게 문의하세요.');
          break;
        case 'RFDrop':
          console.error('카드를 다시 대주세요.');
          break;
      }
    });

    return () => {
      if (socket) socket.disconnect();
    }
  }, []);

  /* 광고 페이지 전환 */
  useEffect(() => {
    const interval = setInterval(() => {
      currentAdPage < adPagesMax
        ? setCurrentAdPage(currentAdPage + 1)
        : setCurrentAdPage(1);
    }, transitionRate)

    return () => clearInterval(interval)
  }, [currentAdPage, adPagesMax])

  // 현재 시간 가져오기
  const [timer, setTimer] = useState('00:00:00');

  const time = () => {
    const date = new Date();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    setTimer(`${hours}:${minutes}:${seconds}`);
  }
  setInterval(time, 500)

  // 현재 날짜 가져오기
  const today = new Date();
  const weekDay = ['일', '월', '화', '수', '목', '금', '토', '일'];
  const formattedDate = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}. (${weekDay[today.getDay()]
    })`

  return (
    <>
    {(() => {
      if (notifyStatus.eventFired)
        // 카드 이벤트 알림창 띄우기
        return (
          <NotifyWindow
            type={notifyStatus.status}
            name={notifyStatus.name}
          />
      );
    })()}
      <main className='flex flex-col p-9 justify-between h-screen bg-white rounded-2xl'>
        <section>
          {/* 로고, 날짜, 시간 + 연구실 소식 섹션 */}
          {/* 로고, 날짜, 시간 섹션 */}
          <section className='flex justify-between'>
            <Image src='/logo.png' width={185} height={0} />
            <div className='flex flex-col items-end'>
              <p className={'text-xl font-semibold tabular-nums'}>
                {(() => `${timer}`)()}
              </p>
              <p className={'text-sm font-semibold text-[#5E636B]'}>
                {(() => formattedDate)()}
              </p>
            </div>
          </section>
          <p className='text-2xl font-bold mt-7 mb-3'>
            리눅스 클라우드 컴퓨팅 심화 실습실
          </p>
          <div className='flex flex-wrap justify-start gap-4'>
            {/* 부원 목록 및 상태 표시 섹션 */}
            {(() => {
              const memberList = [
                // 부원 목록 (테스트 데이터)
                {
                  name: '이세혁',
                  position: '랩장',
                  status: '재실',
                  emoji: '😋',
                  isDisabled: false
                },
                {
                  name: '양준석',
                  position: '부원',
                  status: '수업 중',
                  emoji: '😋',
                  isDisabled: true
                },
                {
                  name: '강병재',
                  position: '부원',
                  status: '재실',
                  emoji: '😃',
                  isDisabled: false
                },
                {
                  name: '신우진',
                  position: '부원',
                  status: '퇴근',
                  emoji: '😁',
                  isDisabled: true
                },
                {
                  name: '이동재',
                  position: '부원',
                  status: '재실',
                  emoji: '😆',
                  isDisabled: false
                },
                {
                  name: '김연진',
                  position: '부원',
                  status: '퇴근',
                  emoji: '😋',
                  isDisabled: true
                },
                {
                  name: '양성모',
                  position: '부원',
                  status: '재실',
                  emoji: '😋',
                  isDisabled: false
                },
                {
                  name: '조정현',
                  position: '부원',
                  status: '퇴근',
                  emoji: '😋',
                  isDisabled: true
                }
              ]
              return memberList.map(user => {
                return (
                  <Profile
                    name={user.name}
                    position={user.position}
                    status={user.status}
                    emoji={user.emoji}
                    isDisabled={user.isDisabled}
                  />
                )
              })
            })()}
          </div>

          <p className='text-2xl font-bold mt-7 mb-3'>연구실 소식</p>
          <div className='flex justify-center items-center bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[9.5rem]'>
            <Image src={`/ad/ad${currentAdPage}.png`} width='1366' height='0' alt='ad' />
          </div>
        </section>

        <footer>
          <div className='flex justify-center items-center bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[8.5rem]'>
            <div className='flex justify-center items-center rounded-full w-[2rem] h-[2rem] animation-pulse bg-[#3081F5]' />
            <p className='absolute font-medium align-center tracking-tight'>
              {`이곳에 ID 카드를 대주세요`}
            </p>
          </div>
        </footer>
        <audio ref={audioRef}>
          <source ref={audioSourceRef} src={''} />
        </audio>
      </main>
    </>
  )
}
