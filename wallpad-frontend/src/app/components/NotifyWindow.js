/*
알림 컴포넌트
파라미터 설명
type:        알림의 종류('success' or 'error')
title:       알림창 제목
content:     본문 내용
*/
const NotifyWindow = ({ type = 'arrived', name = '강병재' }) => {
  const title = {
    'unsupported': '올바르지 않은 카드에요',
    'invalidCrypto': '유효하지 않은 카드에요',
    'RFDrop': '카드를 다시 대주세요',
    'arrival': '출근 상태로 전환 완료!',
    'goHome': '퇴근 상태로 전환 완료!'
  };
  const message = {
    'unsupported': 'OS랩 카드가 아닌 것 같아요. 카드를 확인하고 다시 시도해 주세요.',
    'invalidCrypto': '카드에 잘못된 비밀키가 탑재된 것 같아요. 담당 부원에게 문의하세요.',
    'RFDrop': '카드를 좀 더 오래 태그해 주세요. 정상적으로 처리되면 알림음이 들려요.',
    'arrival': name => `${name}님의 현재 상태를 재실 상태로 전환했어요.`,
    'goHome': name => `${name}님의 현재 상태를 퇴근 상태로 전환했어요.`
  };
  
  return (
    <>
      <div
        className='w-full h-full fixed z-20 bg-slate-950 opacity-30 notify-background'>
      </div>
      <div
        className="bg-white w-[95%] fixed h-[10rem] z-30 rounded-2xl flex flex-col p-5 tracking-tight notify-content">
        <p
          className="text-xl font-bold"
        >{ title[type] }</p>
        <p
          className="text-base pt-2"
        >{ message[type](name) }</p>
      </div>
    </>
  )
}

export default NotifyWindow