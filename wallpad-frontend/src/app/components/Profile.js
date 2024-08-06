/**
 * @brief Member profile component.
 * @author Jay Kang, tlsdnwls
 * @date July 19, 2024
 * @version 0.1
 */

import Image from 'next/image';

const Profile = ({ name, position, status, emoji, github, isAbsent, key }) => { // emoji used as fallback of profile image.
  const disabledColor = '#919398';
  const enabledColor = '#2A2C33';
  
  // `isAbsent` decides whether profile image (or emoji) are shown in grayscale or not.
  const textColor = (isAbsent) ? `text-[${disabledColor}]` : `text-[${enabledColor}]`;
  
  // index matched as the value of the column `position` on db.
  const positionText = ['부원', '랩장', '수습부원', '지도교수']; // in english -> member, leader, probationary member, professor
  
  // index matched as the value of the column `status` on db.
  const statusText = ['부재중', '재실', '수업중', '군대']; // in english -> absent, present, in class

  return (
    <>
      <div
        className={`flex flex-col justify-between bg-[#f2f4f6] w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] pt-[.9rem] pb-[.95rem] ${textColor}`}>

        <div>
          <div className='flex flex-col'>
            <div className='flex items-end'>
              <p className='text-xl font-bold leading-[1.3]'>{name}</p>
              <p className='text-sm ml-1'>{positionText[position]}</p>
            </div>
            <p
              className='text-sm leading-[1.4]'
            >{statusText[status]}</p>
          </div>
        </div>

        <div
          className={`height-[2.5rem] flex flex-row-reverse ${ isAbsent ? 'grayscale' : '' }`}
        >{(() => {
          return (
            <Image
              src={github ?
                `https://github.com/${github}.png` :
                `/emoji/${emoji}.png`}
              className="rounded-full profile-image"
              /* 
              compensate image scale as larger when display github profile,
              as fluentui emoji has a little padding.
              */
              style={{
                scale: (github == null) ? '1.1' : '1',
                opacity: (isAbsent) ? '.7' : '1'
               }}
              width={64}
              height={64}
              key={key}
            />
          );
        })()}
        </div>
      </div>
    </>
  )
}

export default Profile