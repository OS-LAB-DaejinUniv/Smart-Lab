/**
 * @brief Notification window overlay component.
 * @author Jay Kang
 * @date July 23, 2024
 * @version 0.1
 */

import { memo } from 'react';
import Image from 'next/image';

const NotifyWindow = ({ type, name, timesTaken }) => {
  const title = {
    'notosid': '지원하지 않는 카드에요',
    'crypto': '유효하지 않은 카드에요',
    'rfLost': '통신 중 문제가 발생했어요',
    'arrival': '재실 상태로 변경했어요!',
    'goHome': '퇴근 상태로 변경했어요!',
    'NotFoundUser': '문제가 발생했어요'
  };

  const message = {
    'notosid': 'OS랩 카드가 아닌 것 같네요. 카드를 확인하고 다시 시도해 주세요.',
    'crypto': '애플릿의 상태가 올바르지 않아요. 담당 부원에게 문의해 주세요.',
    'rfLost': '카드를 조금만 더 오래 태그해 주세요.',
    'arrival': '님의 상태를 재실 상태로 변경했어요.',
    'goHome': '님의 상태를 퇴근 상태로 변경했어요.',
    'NotFoundUser': '등록되지 않은 스마트카드에요. 담당 부원에게 문의해 주세요.'
  };

  const timesTakenCaption = {
    'arrival': '출근',
    'goHome': '퇴근'
  }

  return (
    <>
      <div
        className='w-full h-full top-0 fixed z-20 bg-slate-950 opacity-30 notify-background'>
      </div>
      <div
        className="bg-white w-[94%] fixed h-auto z-30 rounded-2xl flex flex-col p-5 tracking-tight notify-content">
        <p
          className="text-xl font-bold"
        >{title[type]}</p>
        <p
          className="text-base pt-2"
        >{(name || '') + message[type]}</p>
        {
          (() => {
            if (timesTaken == undefined) return;
            
            const timesTakenMessage = (() => {
              // if user has no usage history.
              if (timesTaken.isFirst) {
                return '앞으로의 연구실 활동을 응원할게요!';
              }
              
              const isDaysNotZero = (timesTaken.day > 0);
              const isHoursNotZero = (timesTaken.hour > 0);
              
              // 1. only `day` overs 1.
              if (isDaysNotZero && !isHoursNotZero) {
                return `${timesTaken.day}일만에 ${timesTakenCaption[type]}했어요.`;
              }
              
              // 2. only `hour` overs 1.
              else if (!isDaysNotZero && isHoursNotZero) {
                return `${timesTaken.hour}시간만에 ${timesTakenCaption[type]}했어요.`;
              }
              
              // 3. both `day` and `hour` are overs 1.
              else if (isDaysNotZero && isHoursNotZero) {
                return `${timesTaken.day}일 ${timesTaken.hour}시간만에 ${timesTakenCaption[type]}했어요.`;
              }
              
              // if both `days` and `hour` are 0.
              else if (!isDaysNotZero && !isHoursNotZero) {
                return null;
              }
            })();
            // console.log('[NotifyWindow.js] generated message:', timesTakenMessage);
            
            if (timesTakenMessage !== null) {
              return (
                <p className="text-base font-semibold text-[#3182F6] items-center flex">
                  <Image
                    src={
                      `/emoji/${timesTaken.isFirst ?
                        'party_popper' :
                        'eight_oclock'}.png`
                    }
                    className="rounded-full noti-clock mr-1"
                    width={64}
                    height={64}
                    key="clock_icon"
                  />
                  { timesTakenMessage }
                </p>
              )
            }
          })()
        }
      </div>
    </>
  )
}

export default memo(NotifyWindow);