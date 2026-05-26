/**
 * @brief Notification window overlay component.
 * @author Jay Kang
 * @date March 8, 2026
 * @version 0.2
 */

import { memo, useEffect, useState } from 'react';
import Image from 'next/image';

// Each append row mounts collapsed (max-height: 0) and snaps to its visible
// state on the next animation frame so the CSS transition actually runs.
const AppendedRow = ({ message }) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`notify-append-row${shown ? ' notify-append-show' : ''}`}>
      <p className="text-base font-semibold text-[var(--wp-accent)] items-center flex pt-2">
        <Image
          src="/emoji/pushpin.png"
          className="rounded-full noti-clock mr-1"
          alt="pushpin"
          width={64}
          height={64}
        />
        {message}
      </p>
    </div>
  );
};

const NotifyWindow = ({ type, appendedMessages = [], ...props }) => {
  const title = {
    'notSupported': '카드를 처리하지 못했어요',
    'crypto': '암호문 교환에 실패했어요',
    'clockin': '재실 상태로 변경했어요!',
    'clockout': '퇴근 상태로 변경했어요!',
    'NotFoundUser': '문제가 발생했어요',
    'tmoneyBalance': '교통카드 잔액 조회 성공!',
    'commError': '카드를 다시 대주세요'
  };

  const message = {
    'notSupported': '올바른 카드인지 확인하고 다시 시도해 주세요.',
    'crypto': 'eID 카드에 설치된 비밀키가 일치하지 않아요.',
    'clockin': '님의 상태를 재실 상태로 변경했어요.',
    'clockout': '님의 상태를 퇴근 상태로 변경했어요.',
    'NotFoundUser': '등록되지 않은 eID 카드에요. 담당 부원에게 문의해 주세요.',
    'tmoneyBalance': `티머니 카드의 잔액이 ${props.balance ?
        parseInt(props.balance).toLocaleString('ko-KR') : '0'
      }원 남았어요.`,
    'commError': '카드를 인식 영역에 맞추어 다시 태그해 주세요.'
  };

  const timesTakenCaption = {
    'clockin': '출근',
    'clockout': '퇴근'
  }

  // Render custom messagebox if provided through props
  if (props.custom)
    return (
      <>
        <div
          className='w-full h-full top-0 fixed z-20 bg-[var(--wp-overlay)]'>
        </div>
        <div
          className="bg-[var(--wp-bg)] w-[486px] fixed h-auto z-30 rounded-2xl flex flex-col p-5 tracking-tight notify-content">
          <p
            className="text-xl font-bold"
          >{props.custom.title}</p>
          <p
            className="text-base pt-2"
          >{props.custom.message}</p>
          {appendedMessages.map((msg, i) => (
            <AppendedRow key={i} message={msg} />
          ))}
        </div>
      </>
    )

  return (
    <>
      <div
        className='w-full h-full top-0 fixed z-20 bg-[var(--wp-overlay)]'>
      </div>
      <div
        className="bg-[var(--wp-bg)] w-[486px] fixed h-auto z-30 rounded-2xl flex flex-col p-5 tracking-tight notify-content">
        <p
          className="text-xl font-bold"
        >{title[type] || title['commError']}</p>
        <p
          className="text-base pt-2"
        >{(props.name || '') + (message[type] || message['commError'])}</p>
        {
          (() => {
            if (props.timesTaken == undefined) return;

            const timesTakenMessage = (() => {
              // if user has no usage history.
              if (props.timesTaken.isFirst) {
                return 'OS랩의 구성원이 되신 것을 환영해요!';
              }

              const isDaysNotZero = (props.timesTaken.day > 0);
              const isHoursNotZero = (props.timesTaken.hour > 0);

              // 1. only `day` overs 1.
              if (isDaysNotZero && !isHoursNotZero) {
                return `${props.timesTaken.day}일만에 ${timesTakenCaption[type]}했어요.`;
              }

              // 2. only `hour` overs 1.
              else if (!isDaysNotZero && isHoursNotZero) {
                return `${props.timesTaken.hour}시간만에 ${timesTakenCaption[type]}했어요.`;
              }

              // 3. both `day` and `hour` are overs 1.
              else if (isDaysNotZero && isHoursNotZero) {
                return `${props.timesTaken.day}일 ${props.timesTaken.hour}시간만에 ${timesTakenCaption[type]}했어요.`;
              }

              // if both `days` and `hour` are 0.
              else if (!isDaysNotZero && !isHoursNotZero) {
                return null;
              }
            })();
            console.log('[NotifyWindow.js] message:', timesTakenMessage);

            if (timesTakenMessage !== null) {
              return (
                <p className="text-base font-semibold text-[var(--wp-accent)] items-center flex">
                  <Image
                    src={
                      `/emoji/${props.timesTaken.isFirst ?
                        'party_popper' :
                        'eight_oclock'}.png`
                    }
                    className="rounded-full noti-clock mr-1"
                    alt='notice_icon'
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
        {appendedMessages.map((msg, i) => (
          <AppendedRow key={i} message={msg} />
        ))}
      </div>
    </>
  )
}

export default memo(NotifyWindow);