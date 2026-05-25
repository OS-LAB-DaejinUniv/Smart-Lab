import { Monitor, Users, Code, Newspaper, History, Settings } from 'lucide-react';

export const sectionMenu = [
    { slug: 'system',    href: '/settings/system',    name: '시스템 상태',    desc: '시스템 상태를 확인하거나 변경할 수 있어요.',                      icon: Monitor   },
    { slug: 'member',    href: '/settings/member',    name: '구성원 관리',    desc: '새로운 부원을 등록하거나 등록된 정보를 변경할 수 있어요.',          icon: Users     },
    { slug: 'extension', href: '/settings/extension', name: '이벤트 리스너',  desc: '출퇴근 이벤트에 반응하여 실행되는 스크립트를 작성할 수 있어요.',    icon: Code      },
    { slug: 'ad',        href: '/settings/ad',        name: '연구실 소식',    desc: '출석부 화면에 표시되는 광고 이미지를 변경할 있어요.',       icon: Newspaper },
    { slug: 'log',       href: '/settings/log',       name: '로그 조회',      desc: '출퇴근 내역을 검색하고 조회할 수 있어요.',                          icon: History   },
    { slug: 'config',    href: '/settings/config',    name: '환경설정',       desc: '장치 설정을 변경할 수 있어요.',                                   icon: Settings  },
];
