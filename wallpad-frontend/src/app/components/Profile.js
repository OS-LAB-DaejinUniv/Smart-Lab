/**
 * @brief Member profile component.
 * @author Jay Kang, tlsdnwls
 * @date March 8, 2026
 * @version 0.3
 */

import React, { memo, useState } from 'react';
import Image from 'next/image';

const Profile = ({ name, position, status, emoji, github, isAbsent, uuid }) => { // emoji used as fallback of profile image.
  const disabledColor = '#6B7684';
  const enabledColor = '#3182F6';
  const [githubFailed, setGithubFailed] = useState(false);

  // `isAbsent` decides whether profile image (or emoji) are shown in grayscale or not.
  //const textColor = (isAbsent) ? `text-[${disabledColor}]` : `text-[${enabledColor}]`;

  // index matched as the value of the column `position` on db.
  const positionText = ['부원', '랩장', '수습부원', '지도교수']; // member, leader, probationary member, professor

  // index matched as the value of the column `status` on db.
  const statusText = ['부재중', '재실', '수업중', '자리비움', '휴학']; // absent, present, in class, in military service

  // determine if we should try to load GitHub image
  const useGithub = github && !githubFailed;

  return (
    <>
      <div
        className={`flex flex-col justify-between ${status == 1 ? 'bg-[#e8f3ff]' : 'bg-[#f2f4f6]'} w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] pt-[.9rem] pb-[.95rem]`}
      >

        <div>
          <div className='flex flex-col'>
            <div className='flex items-end'>
              <p
                className={`text-xl font-bold leading-[1.3]`}
                style={{ color: (isAbsent) ? disabledColor : '' }}>
                {name}
              </p>
              <p
                className='text-sm ml-1'
                style={{ color: (isAbsent) ? disabledColor : '' }}>
                {positionText[position]}
              </p>
            </div>
            <p
              className={`text-sm leading-[1.4] ${isAbsent ? '' : 'font-semibold'}`}
              style={{ color: (isAbsent) ? disabledColor : enabledColor }}>
              {statusText[status]}</p>
          </div>
        </div>

        <div
          className={`height-[2.5rem] flex flex-row-reverse ${isAbsent ? 'grayscale' : ''}`}
        >{(() => {
          return (
            <Image
              src={useGithub ?
                `https://github.com/${github}.png` :
                `/emoji/${emoji}.png`}
              className="rounded-full profile-image"
              alt="Profile image"
              /* 
              compensate image scale as larger when display github profile,
              as fluentui emoji has a little padding.
              */
              style={{
                scale: (useGithub) ? '1' : '1.1',
                opacity: (isAbsent) ? '.7' : '1'
              }}
              width={64}
              height={64}
              key={uuid}
              onError={() => {
                // GitHub profile image failed to load (404), fallback to emoji
                if (github && !githubFailed) {
                  console.log(`[Profile] GitHub image failed for ${github}, falling back to emoji`);
                  setGithubFailed(true);
                }
              }}
            />
          );
        })()}
        </div>
      </div>
    </>
  )
}

export default memo(Profile);
