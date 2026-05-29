/**
 * @brief Flip clock component.
 * @date March 9 2026
 */

import React, { useState, useEffect, memo } from 'react';

const DIGITS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

const FlipDigit = ({ digit }) => (
  <div className='relative'>
    <div
      className='absolute bottom-0 h-[1000%] transition-transform duration-500 ease-out'
      style={{ transform: `translateY(${digit}em)` }}
    >
      {DIGITS.map((n) => (
        <div key={n} className='flex h-[10%]'>
          <span className='block w-full text-center'>{n}</span>
        </div>
      ))}
    </div>
    <span className='invisible'>0</span>
  </div>
);

const FlipClock = () => {
  const [time, setTime] = useState({ h1: 0, h2: 0, m1: 0, m2: 0, s1: 0, s2: 0 });
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'];

    const updateClock = () => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setTime({
        h1: Number(hours[0]),
        h2: Number(hours[1]),
        m1: Number(minutes[0]),
        m2: Number(minutes[1]),
        s1: Number(seconds[0]),
        s2: Number(seconds[1]),
      });
      setFormattedDate(`${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. (${weekDay[date.getDay()]})`);
    };

    updateClock();
    const intervalId = setInterval(updateClock, 200);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className='flex flex-col items-end'>
      <span className='relative flex w-fit flex-row-reverse overflow-hidden text-xl font-semibold leading-none tabular-nums'>
        <FlipDigit digit={time.s2} />
        <FlipDigit digit={time.s1} />
        <div>:</div>
        <FlipDigit digit={time.m2} />
        <FlipDigit digit={time.m1} />
        <div>:</div>
        <FlipDigit digit={time.h2} />
        <FlipDigit digit={time.h1} />
      </span>
      <p className={'mt-1 text-sm font-semibold text-[var(--wp-fg-muted)]'}>
        {formattedDate}
      </p>
    </div>
  );
};

export default memo(FlipClock);
