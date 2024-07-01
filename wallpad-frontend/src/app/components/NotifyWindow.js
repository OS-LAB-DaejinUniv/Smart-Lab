/*
알림 컴포넌트
파라미터 설명
type:        알림의 종류('success' or 'error')
title:       알림창 제목
content:     본문 내용
*/
const NotifyWindow = ({ type = 'success', title = '강병재님 안녕하세요', content = '출근 상태로 변경했어요! 오늘도 즐거운 하루 되세요.' }) => {
  const disabledColor = '#919398';
  const enabledColor = '#2A2C33';

  return (
    <>
      <div
        className='w-full h-full fixed z-20 bg-slate-950 opacity-30'>
      </div>
      <div
        className="bg-white w-3/4 fixed h-[10rem] z-30 rounded-2xl flex flex-col px-4 pt-5 pb-3 notify-window">
        <p
          className="text-xl font-bold"
        >{title}</p>
        <p
          className="text-sm"
        >{content}</p>
      </div>
    </>
  )
}

export default NotifyWindow