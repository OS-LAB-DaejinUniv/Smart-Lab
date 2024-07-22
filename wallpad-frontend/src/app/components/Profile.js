/**
 * @brief Member profile component.
 * @author Jay Kang, tlsdnwls
 * @date July 19, 2024
 * @version 0.1
 */

import Image from 'next/image';

const Profile = ({ name, position, status, emoji, github = null, isDisabled = false }) => { // emoji used as fallback of profile image.
  const disabledColor = '#919398';
  const enabledColor = '#2A2C33';
  // `isDisabled` decides whether profile image (or emoji) are shown in grayscale or not.
  const textColor = (isDisabled) ? `text-[${disabledColor}]` : `text-[${enabledColor}]`;
  const positionText = ['부원', '랩장'];
  const statusText = ['부재중', '재실', '군대'];

  return (
    <>
      <div
        className={`bg-[#f2f4f6] w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] py-[0.8rem] ${textColor}`}>

        <div>
          <div className='flex flex-col'>
            <div className='flex items-end'>
              <p className='text-xl font-bold leading-[1.3]'>{name}</p>
              <p className='text-sm ml-1'>{positionText[parseInt(position)]}</p>
            </div>
            <p
              className='text-sm leading-[1.4]'
            >{statusText[parseInt(status)]}</p>
          </div>
        </div>

        <div
          className={`height-[2.5rem] flex flex-row-reverse`}
          style={{ filter: `${(isDisabled === 0) ? 'grayscale(100%)' : ''}` }}
        >{(() => {
          return (
            <Image
              src={github ?
                `https://github.com/${github}.png` :
                `/emoji/${emoji}.png`}
              className="rounded-full profile-image"
              /* 
              compensate image size as larger when display github profile,
              as fluentui emoji has a little padding.
              */
              style={{
                scale: (!github) ? '1.08' : '1.0',
                opacity: (!isDisabled) ? '0.8' : '1.0'
               }}
              width={50}
              height={50}
              key={github}
            />
          );
        })()}
        </div>
      </div>
    </>
  )
}

export default Profile