'use client'

import { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Pagination, PaginationContent, PaginationEllipsis,
    PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuItem, DropdownMenuContent,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ListFilter, ArrowRight, ArrowLeft } from 'lucide-react';

import { backendPort } from '../_lib/backend';
import { authFetch } from '../_lib/auth';

export default function LogsSection() {
    const [logs, setLogs] = useState([]);
    const [UUIDName, setUUIDName] = useState({});
    const [statusCaption, setStatusCaption] = useState({});
    const [filter, setFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    function updateFilter() {
        if (!filter) {
            fetchMemberList()
                .then(memberList => {
                    let uuid = {};
                    memberList.forEach(item => uuid[item.uuid] = true);
                    setFilter({ uuid, datetime: {} });
                });
        }
    }

    useEffect(() => {
        if (!filter) return;
        fetchLogs(filter, currentPage, pageSize);
    }, [filter, currentPage, pageSize]);

    function fetchLogs(filter, page = 1, limit = 10) {
        const logURL = new URL('/wallpad/management/card/history', `http://${location.hostname}:${backendPort}`);
        authFetch(logURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter, page, limit })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setLogs(body.rows);
                    if (body.pagination) {
                        setTotalPages(body.pagination.totalPages || 1);
                        setTotalItems(body.pagination.total || 0);
                    }
                    return;
                }
                throw new Error();
            })
            .catch(err => console.error('failed to fetch logs', err));
    }

    function fetchMemberList() {
        const url = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);
        return authFetch(url)
            .then(res => res.json())
            .then(body => {
                if (body.status) return body.rows;
                throw new Error();
            })
            .catch(err => console.error('failed to fetch member list', err));
    }

    function fetchStatusCaption() {
        const statusCaptionURL = new URL('/wallpad/management/member/statuscaption', `http://${location.hostname}:${backendPort}`);
        authFetch(statusCaptionURL)
            .then(res => res.json())
            .then(body => {
                if (body.status) setStatusCaption(body.caption);
            })
            .catch(err => console.error('failed to fetch StatusCaption', err));
    }

    function resolveUUID(uuid) {
        if (UUIDName.hasOwnProperty(uuid)) return UUIDName[uuid];

        const selectMemberURL = new URL(`/wallpad/management/member/${uuid}`, `http://${location.hostname}:${backendPort}`);
        authFetch(selectMemberURL)
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setUUIDName(prev => ({ ...prev, [uuid]: body.row.name }));
                    return;
                }
                throw new Error();
            })
            .catch(err => {
                console.error('failed to fetch memberList', err);
                setUUIDName(prev => ({ ...prev, [uuid]: '??' }));
            });

        return '...';
    }

    useEffect(() => {
        fetchStatusCaption();
        updateFilter();
    }, []);

    return (
        <div className='flex flex-col space-y-5 pb-[7rem]'>
            <div className="flex flex-col w-full justify-center">
                <div className="-mx-4 sm:mx-0">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[60px] sm:w-[100px] font-semibold">번호</TableHead>
                                <TableHead className="font-semibold w-[100px]">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                            이름
                                            <ListFilter className="w-3.5 h-3.5 ml-[.2rem] mt-[.15rem] text-gray-500" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>조회하려는 부원을 선택하세요.</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {filter?.uuid && Object.keys(filter.uuid).map(key => (
                                                <DropdownMenuItem
                                                    onClick={evt => evt.preventDefault()}
                                                    className="flex gap-2 items-center"
                                                    key={key}
                                                >
                                                    <Checkbox
                                                        data-state="unchecked"
                                                        defaultChecked={filter.uuid[key]}
                                                        onCheckedChange={changedStatus => {
                                                            filter.uuid[key] = changedStatus;
                                                            setFilter({ ...filter });
                                                        }}
                                                    />
                                                    <label className="pt-[.1rem]">{resolveUUID(key)}</label>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                                <TableHead className="hidden sm:table-cell w-[140px] font-semibold">일련번호</TableHead>
                                <TableHead className="w-[80px] sm:w-[120px] font-semibold">변동내역</TableHead>
                                <TableHead className="w-auto sm:w-[200px] font-semibold">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="flex px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 w-fit">
                                            <span className="hidden sm:inline" style={{ color: '#71717A' }}>날짜 및 시간</span>
                                            <span className="sm:hidden">일시</span>
                                            <ListFilter className="w-3.5 h-3.5 ml-[.2rem] mt-[.15rem] text-gray-500" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>조회하려는 날짜 또는 기간을 지정하세요.</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem><Input /></DropdownMenuItem>
                                            <DropdownMenuItem />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log, idx) => (
                                <TableRow key={`${log.uuid}-${log.at}`}>
                                    <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                                    <TableCell>{resolveUUID(log.uuid)}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="font-mono text-xs bg-slate-100 rounded-md py-1 px-1.5 w-fit">
                                                        {String(log.uuid)}
                                                    </p>
                                                </TooltipTrigger>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell>
                                        <p className="flex items-center gap-1">
                                            {log.type == 1
                                                ? <ArrowRight className="w-3.5 h-3.5 mb-[.1rem] stroke-red-500" />
                                                : <ArrowLeft className="w-3.5 h-3.5 mb-[.1rem] stroke-blue-500" />}
                                            <span>{statusCaption[log.type]}</span>
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p>
                                                        {(() => {
                                                            const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
                                                            const t = new Date(log.at);
                                                            return (
                                                                <>
                                                                    {`${t.getMonth() + 1}월 ${t.getDate()}일 `}
                                                                    <span className={(() => {
                                                                        const day = new Date(log.at).getDay();
                                                                        if (day == 0) return 'text-red-500';
                                                                        if (day == 6) return 'text-blue-500';
                                                                    })()}>
                                                                        {`(${weekDay[t.getDay()]}) `}
                                                                    </span>
                                                                    {`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`}
                                                                </>
                                                            );
                                                        })()}
                                                    </p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div>
                                                        {(() => {
                                                            const weekDay = ['일', '월', '화', '수', '목', '금', '토'];
                                                            const t = new Date(log.at);
                                                            return (
                                                                `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일 ${weekDay[t.getDay()]}요일 ` +
                                                                `${String(t.getHours()).padStart(2, '0')}시 ${String(t.getMinutes()).padStart(2, '0')}분 ${String(t.getSeconds()).padStart(2, '0')}초`
                                                            );
                                                        })()}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>페이지당</span>
                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>건 · 총 {totalItems}건</span>
                    </div>
                    <Pagination className="w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {(() => {
                                const pages = [];
                                const maxVisible = 5;
                                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                let end = Math.min(totalPages, start + maxVisible - 1);
                                if (end - start + 1 < maxVisible) {
                                    start = Math.max(1, end - maxVisible + 1);
                                }
                                if (start > 1) {
                                    pages.push(
                                        <PaginationItem key={1}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(1)}
                                                isActive={currentPage === 1}
                                                className={`cursor-pointer ${currentPage === 1 ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                            >1</PaginationLink>
                                        </PaginationItem>
                                    );
                                    if (start > 2) pages.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
                                }
                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(i)}
                                                isActive={currentPage === i}
                                                className={`cursor-pointer ${currentPage === i ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                            >{i}</PaginationLink>
                                        </PaginationItem>
                                    );
                                }
                                if (end < totalPages) {
                                    if (end < totalPages - 1) pages.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
                                    pages.push(
                                        <PaginationItem key={totalPages}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(totalPages)}
                                                isActive={currentPage === totalPages}
                                                className={`cursor-pointer ${currentPage === totalPages ? 'bg-black text-white hover:bg-black hover:text-white' : ''}`}
                                            >{totalPages}</PaginationLink>
                                        </PaginationItem>
                                    );
                                }
                                return pages;
                            })()}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    );
}
