'use client'

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, ChevronRight } from 'lucide-react';

import delay from '../../utils/delay';
import { backendPort } from '../_lib/backend';
import { authFetch, clearTokens } from '../_lib/auth';
import { formatBackendError, formatThrownError } from '../_lib/error';

// Single-row helper: label + optional description on the left, control(s) on
// the right, with its own border-bottom so rows compose without a parent
// picking separators. Mirrors the screenshot pattern.
function SettingsRow({ label, description, htmlFor, children, align = 'center' }) {
    return (
        <div className={`flex ${align === 'top' ? 'items-start' : 'items-center'} justify-between py-4 gap-6 border-b last:border-b-0`}>
            <div className="flex-1 min-w-0">
                <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                {children}
            </div>
        </div>
    );
}

// Inline section header between row groups (matches "다단계 인증(MFA)" etc.).
function SectionHeading({ children }) {
    return <h2 className="text-base font-semibold pt-6 pb-1">{children}</h2>;
}

// Time string ("HH:MM") <-> minutes-since-midnight helpers used by the dark
// mode time slider. The slider treats midnight (1440) and midnight (0) as
// equivalent for display, but we save 1440 back as "00:00".
const _padZ = (n) => String(n).padStart(2, '0');
const minToTime = (m) => `${_padZ(Math.floor((m % 1440) / 60))}:${_padZ(m % 60)}`;
const timeToMin = (t) => {
    const m = /^(\d{2}):(\d{2})$/.exec(String(t || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

// Update only the first text-node child of `el` so sibling icons (e.g. lucide
// SVGs) are not wiped out the way `innerText = ...` would.
function setButtonText(el, text) {
    if (!el) return;
    const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = text;
    else el.prepend(document.createTextNode(text));
}

export default function ConfigSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [adTransitionRate, setAdTransitionRate] = useState(8000);
    const [memberStatusCaption, setMemberStatusCaption] = useState(['', '', '']);
    const [arduinoDeviceSerial, setArduinoDeviceSerial] = useState('');
    const [scheduledRefreshEnabled, setScheduledRefreshEnabled] = useState(false);
    const [scheduledRefreshTime, setScheduledRefreshTime] = useState('00:00');
    const [themeMode, setThemeMode] = useState('light');
    const [themeDarkStart, setThemeDarkStart] = useState('19:00');
    const [themeDarkEnd, setThemeDarkEnd] = useState('07:00');
    const [clockStyle, setClockStyle] = useState('flip');
    const [logoSrcs, setLogoSrcs] = useState({ light: null, dark: null });
    const [logoUploadingVariant, setLogoUploadingVariant] = useState(null);
    const [webhookUrlsText, setWebhookUrlsText] = useState('');
    const logoLightFileInputRef = useRef(null);
    const logoDarkFileInputRef = useRef(null);

    const [isOpenPasswordDialog, setIsOpenPasswordDialog] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [isOpenRebootDialog, setIsOpenRebootDialog] = useState(false);
    const [isOpenRestartBackendDialog, setIsOpenRestartBackendDialog] = useState(false);
    const [rebootError, setRebootError] = useState('');
    const [restartBackendError, setRestartBackendError] = useState('');
    const refreshButtonRef = useRef(null);
    const rebootButtonRef = useRef(null);
    const restartBackendButtonRef = useRef(null);

    useEffect(() => { fetchConfig(); }, []);

    function fetchConfig() {
        const url = new URL('/wallpad/config/public', `http://${location.hostname}:${backendPort}`);
        fetch(url)
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setTitle(body.title || '');
                    setAdTransitionRate(body.adTransitionRate || 8000);
                    if (Array.isArray(body.memberStatusCaption)) setMemberStatusCaption(body.memberStatusCaption);
                    setArduinoDeviceSerial(body.arduinoDeviceSerial || '');
                    setScheduledRefreshEnabled(!!body.scheduledRefresh?.enabled);
                    setScheduledRefreshTime(body.scheduledRefresh?.time || '00:00');
                    if (body.theme && typeof body.theme === 'object') {
                        setThemeMode(['light', 'dark', 'auto'].includes(body.theme.mode) ? body.theme.mode : 'light');
                        if (/^\d{2}:\d{2}$/.test(body.theme.darkStart)) setThemeDarkStart(body.theme.darkStart);
                        if (/^\d{2}:\d{2}$/.test(body.theme.darkEnd)) setThemeDarkEnd(body.theme.darkEnd);
                    }
                    if (body.clockStyle === 'flip' || body.clockStyle === 'normal') {
                        setClockStyle(body.clockStyle);
                    }
                    if (body.logoUrls && typeof body.logoUrls === 'object') {
                        const v = body.logoVersion || 0;
                        const base = `http://${location.hostname}:${backendPort}`;
                        setLogoSrcs({
                            light: body.logoUrls.light ? `${base}${body.logoUrls.light}?v=${v}` : null,
                            dark: body.logoUrls.dark ? `${base}${body.logoUrls.dark}?v=${v}` : null,
                        });
                    } else {
                        setLogoSrcs({ light: null, dark: null });
                    }
                    setWebhookUrlsText(Array.isArray(body.webhookUrls) ? body.webhookUrls.join('\n') : '');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch config:', err);
                setLoading(false);
            });
    }

    function saveConfig() {
        setSaving(true);
        const url = new URL('/wallpad/management/config', `http://${location.hostname}:${backendPort}`);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                adTransitionRate: parseInt(adTransitionRate),
                memberStatusCaption,
                arduinoDeviceSerial,
                scheduledRefresh: {
                    enabled: !!scheduledRefreshEnabled,
                    time: /^\d{2}:\d{2}$/.test(scheduledRefreshTime) ? scheduledRefreshTime : '00:00',
                },
                theme: {
                    mode: themeMode,
                    darkStart: /^\d{2}:\d{2}$/.test(themeDarkStart) ? themeDarkStart : '19:00',
                    darkEnd: /^\d{2}:\d{2}$/.test(themeDarkEnd) ? themeDarkEnd : '07:00',
                },
                clockStyle,
                webhookUrls: webhookUrlsText.split('\n').map(s => s.trim()).filter(Boolean)
            })
        })
            .then(res => res.json())
            .then(body => {
                setSaving(false);
                if (body.status) {
                    toast.success('설정을 저장했어요.');
                } else {
                    toast.error('설정 저장에 실패했어요.', { description: body.reason || undefined });
                }
            })
            .catch(err => {
                setSaving(false);
                console.error('Failed to save config:', err);
                toast.error('설정 저장에 실패했어요.');
            });
    }

    function changePassword() {
        setPasswordError('');

        if (!currentPassword) { setPasswordError('현재 비밀번호를 입력해주세요.'); return; }
        if (!newUsername && !newPassword) { setPasswordError('새 아이디 또는 새 비밀번호를 입력해주세요.'); return; }
        if (newPassword && newPassword !== newPasswordConfirm) { setPasswordError('새 비밀번호 확인이 일치하지 않아요.'); return; }

        setPasswordSaving(true);
        const url = new URL('/wallpad/management/password/change', `http://${location.hostname}:${backendPort}`);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword,
                newUsername: newUsername || undefined,
                newPassword: newPassword || undefined,
            })
        })
            .then(res => res.json())
            .then(body => {
                setPasswordSaving(false);
                if (body.status) {
                    toast.success('계정 정보가 변경되어서 다시 로그인해야 해요.');
                    clearTokens();
                    window.location.reload();
                } else {
                    setPasswordError(formatBackendError(body, '계정 변경에 실패했어요.'));
                }
            })
            .catch(err => {
                setPasswordSaving(false);
                console.error('Failed to change password:', err);
                setPasswordError(formatThrownError(err, '계정 변경에 실패했어요.'));
            });
    }

    function uploadLogo(variant, file) {
        if (!file) return;
        if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
            toast.error('지원하지 않는 이미지 형식이에요.', { description: 'PNG / JPG / GIF / WEBP만 업로드할 수 있어요.' });
            return;
        }
        const inputRef = variant === 'dark' ? logoDarkFileInputRef : logoLightFileInputRef;
        setLogoUploadingVariant(variant);
        const formData = new FormData();
        formData.append('inputImage', file);
        const url = new URL(`/wallpad/logo/${variant}/upload`, `http://${location.hostname}:${backendPort}`);
        authFetch(url, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(body => {
                setLogoUploadingVariant(null);
                if (inputRef.current) inputRef.current.value = '';
                if (body.status) {
                    fetchConfig();
                    toast.success(`${variant === 'dark' ? '다크' : '라이트'} 로고가 업데이트되었어요.`);
                } else {
                    toast.error('로고 업로드에 실패했어요.');
                }
            })
            .catch(err => {
                setLogoUploadingVariant(null);
                if (inputRef.current) inputRef.current.value = '';
                console.error('Failed to upload logo:', err);
                toast.error('로고 업로드에 실패했어요.');
            });
    }

    function wallpadReload() {
        const refreshURL = new URL('/wallpad/refresh', `http://${location.hostname}:${backendPort}`);
        authFetch(refreshURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmcache: true })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    refreshButtonRef.current.disabled = true;
                    setButtonText(refreshButtonRef.current, '성공!');
                    delay(1000).then(() => {
                        refreshButtonRef.current.disabled = false;
                        setButtonText(refreshButtonRef.current, '실행');
                    });
                    return;
                }
                throw new Error();
            })
            .catch(() => {
                refreshButtonRef.current.disabled = true;
                setButtonText(refreshButtonRef.current, '문제가 생겼어요');
                delay(1000).then(() => {
                    refreshButtonRef.current.disabled = false;
                    setButtonText(refreshButtonRef.current, '실행');
                });
            });
    }

    function wallpadReboot() {
        setRebootError('');
        const refreshURL = new URL('/wallpad/reboot', `http://${location.hostname}:${backendPort}`);
        authFetch(refreshURL, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    rebootButtonRef.current.disabled = true;
                    setButtonText(rebootButtonRef.current, '재시작 요청함');
                    return;
                }
                setRebootError(formatBackendError(body, '재시작에 실패했어요.'));
            })
            .catch((err) => {
                setRebootError(formatThrownError(err, '재시작에 실패했어요.'));
            });
    }

    function wallpadRestartBackend() {
        setRestartBackendError('');
        const restartURL = new URL('/wallpad/restart-backend', `http://${location.hostname}:${backendPort}`);
        authFetch(restartURL, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setIsOpenRestartBackendDialog(false);
                    return;
                }
                setRestartBackendError(formatBackendError(body, '백엔드 재시작에 실패했어요.'));
            })
            .catch((err) => {
                setRestartBackendError(formatThrownError(err, '백엔드 재시작에 실패했어요.'));
            });
    }

    function openPasswordDialog() {
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setPasswordError('');
        setIsOpenPasswordDialog(true);
    }

    if (loading) {
        return <div className="text-center py-12 text-sm text-muted-foreground">설정을 불러오는 중...</div>;
    }

    const logoSlots = [
        { variant: 'light', label: '라이트', previewBg: '#ffffff', emptyColor: '#6B7684' },
        { variant: 'dark', label: '다크', previewBg: '#0f1419', emptyColor: '#8b95a1' },
    ];

    return (
        <div className="w-full max-w-2xl pb-24">
            <div className="pt-2">
                <h2 className="text-base font-semibold mb-1">출석부 화면 로고</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    메인 화면 상단에 384×75 크기로 표시돼요.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {logoSlots.map(({ variant, label, previewBg, emptyColor }) => {
                        const inputRef = variant === 'dark' ? logoDarkFileInputRef : logoLightFileInputRef;
                        const src = logoSrcs[variant];
                        const uploading = logoUploadingVariant === variant;
                        return (
                            <div key={variant} className="rounded-lg border bg-card overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-sm"
                                        onClick={() => inputRef.current?.click()}
                                        disabled={logoUploadingVariant !== null}
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1" />
                                        {uploading ? '업로드 중...' : '업로드'}
                                    </Button>
                                    <input
                                        ref={inputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif,image/webp"
                                        onChange={(e) => uploadLogo(variant, e.target.files?.[0])}
                                        disabled={logoUploadingVariant !== null}
                                        className="hidden"
                                    />
                                </div>
                                <div
                                    className="flex items-center justify-center"
                                    style={{ height: 96, backgroundColor: previewBg }}
                                >
                                    {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={src}
                                            alt={`현재 ${label} 로고`}
                                            style={{ maxWidth: '90%', maxHeight: 75, objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <span className="text-sm" style={{ color: emptyColor }}>
                                            등록된 로고가 없어요
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <SectionHeading>일반</SectionHeading>

            <SettingsRow
                label="출석부 이름"
                description="메인 화면에 보여질 조직 이름을 입력해 주세요."
                htmlFor="wp-title"
            >
                <Input
                    id="wp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-64"
                    placeholder="조직 이름"
                />
            </SettingsRow>

            <SettingsRow
                label="출석부 화면 테마"
                description="라이트 / 다크 또는 시간대에 따라 자동으로 전환할 수 있어요."
            >
                <Select value={themeMode} onValueChange={setThemeMode}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">라이트</SelectItem>
                        <SelectItem value="dark">다크</SelectItem>
                        <SelectItem value="auto">자동</SelectItem>
                    </SelectContent>
                </Select>
            </SettingsRow>

            {themeMode === 'auto' && (() => {
                // Slider model: the two handles bracket the LIGHT period; outside
                // that range = dark. Map state (darkStart/darkEnd) into ascending
                // [lightStart, lightEnd]; on change, invert back.
                const a = timeToMin(themeDarkEnd);   // dark ends → light starts
                const b = timeToMin(themeDarkStart); // dark starts → light ends
                const lightStart = Math.min(a, b);
                const lightEnd = Math.max(a, b);
                return (
                    <div className="flex flex-col py-4 gap-3 border-b last:border-b-0">
                        <div>
                            <p className="text-sm font-medium">다크 모드 시간대</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                음영으로 표시된 시간대에서만 라이트 모드가 활성화돼요.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground tabular-nums w-10">{minToTime(lightStart)}</span>
                            <Slider
                                min={0}
                                max={1440}
                                step={15}
                                value={[lightStart, lightEnd]}
                                onValueChange={([s, e]) => {
                                    setThemeDarkEnd(minToTime(s));
                                    setThemeDarkStart(minToTime(e));
                                }}
                                className="flex-1"
                                aria-label="라이트 모드 구간"
                            />
                            <span className="text-sm text-muted-foreground tabular-nums w-10 text-right">{minToTime(lightEnd)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            라이트 <span className="font-medium text-muted-foreground tabular-nums">{minToTime(lightStart)} ~ {minToTime(lightEnd)}</span>
                            <span className="mx-1.5">·</span>
                            다크 <span className="font-medium text-muted-foreground tabular-nums">{minToTime(lightEnd)} → {minToTime(lightStart)}</span>
                        </p>
                    </div>
                );
            })()}

            <SettingsRow
                label="시계 스타일"
                description="출석부 화면에 보여질 시계 스타일을 선택할 수 있어요."
            >
                <Select value={clockStyle} onValueChange={setClockStyle}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="flip">플립</SelectItem>
                        <SelectItem value="normal">일반</SelectItem>
                    </SelectContent>
                </Select>
            </SettingsRow>

            <SectionHeading>광고</SectionHeading>

            <SettingsRow
                label="광고 전환 주기"
                description="지정한 시간 간격으로 광고가 전환돼요."
                htmlFor="ad-rate"
            >
                <Input
                    id="ad-rate"
                    type="number"
                    value={adTransitionRate}
                    onChange={(e) => setAdTransitionRate(e.target.value)}
                    className="w-24 text-right"
                    min={1000}
                    max={60000}
                    step={1000}
                />
                <span className="text-sm text-muted-foreground">ms</span>
            </SettingsRow>

            <SectionHeading>시스템</SectionHeading>

            <SettingsRow
                label="카드 판독기 설정"
                description="카드 판독기의 일련번호를 입력해 주세요."
                htmlFor="arduino-serial"
            >
                <Input
                    id="arduino-serial"
                    value={arduinoDeviceSerial}
                    onChange={(e) => setArduinoDeviceSerial(e.target.value)}
                    className="w-64 font-mono text-sm"
                    placeholder="20자리 16진수 값"
                />
            </SettingsRow>

            <SettingsRow
                label="출석부 화면 자동 새로고침"
                description=""
                htmlFor="auto-refresh"
            >
                <Switch
                    id="auto-refresh"
                    checked={scheduledRefreshEnabled}
                    onCheckedChange={setScheduledRefreshEnabled}
                />
            </SettingsRow>

            {scheduledRefreshEnabled && (
                <SettingsRow label="재시작 시각" description="">
                    <Input
                        type="time"
                        value={scheduledRefreshTime}
                        onChange={(e) => setScheduledRefreshTime(e.target.value)}
                        className="w-28 font-mono"
                    />
                </SettingsRow>
            )}

            <div className="flex flex-col py-4 gap-3 border-b last:border-b-0">
                <div>
                    <Label htmlFor="webhook-urls" className="text-sm font-medium">Webhook 등록</Label>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        출석부 상태가 변동될 때 지정한 URL로 변동된 상태를 전송해요. 개행으로 구분하여 입력해 주세요.
                    </p>
                </div>
                <textarea
                    id="webhook-urls"
                    value={webhookUrlsText}
                    onChange={(e) => setWebhookUrlsText(e.target.value)}
                    placeholder={'http://example.com/hook\nhttp://portal.oslab/notify'}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
            </div>

            <SectionHeading>문제 해결</SectionHeading>

            <SettingsRow
                label="출석부 새로고침"
                description="출석부 화면의 이미지가 제대로 표시되지 않을 때 사용해 주세요."
            >
                <Button
                    ref={refreshButtonRef}
                    variant="ghost"
                    size="sm"
                    className="h-8 -mr-2 text-muted-foreground hover:text-foreground"
                    onClick={wallpadReload}
                >
                    실행
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
            </SettingsRow>

            <SettingsRow
                label="서비스 재시작"
                description="labtop 서비스를 재시작합니다."
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -mr-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsOpenRestartBackendDialog(true)}
                >
                    실행
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
            </SettingsRow>

            <SettingsRow
                label="시스템 재시작"
                description="OS를 재시작합니다."
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -mr-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsOpenRebootDialog(true)}
                >
                    실행
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
            </SettingsRow>

            <SectionHeading>계정</SectionHeading>

            <SettingsRow
                label="관리자 로그인 계정 변경"
                description="아이디 또는 비밀번호를 변경합니다."
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -mr-2 text-muted-foreground hover:text-foreground"
                    onClick={openPasswordDialog}
                >
                    변경하기
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
            </SettingsRow>

            {/* sticky 저장 바 — 긴 페이지에서도 항상 닿게 */}
            <div className="sticky bottom-0 mt-8 -mx-4 sm:mx-0 bg-background/90 backdrop-blur border-t flex justify-end py-3 px-4 sm:px-0">
                <Button
                    onClick={saveConfig}
                    disabled={saving}
                    className="min-w-[7rem]"
                >
                    {saving ? '저장 중...' : '설정 저장'}
                </Button>
            </div>

            <AlertDialog open={isOpenPasswordDialog} onOpenChange={setIsOpenPasswordDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>관리자 계정 변경</AlertDialogTitle>
                        <AlertDialogDescription>
                            사용자 이름과 비밀번호를 변경할 수 있어요.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-sm font-medium">현재 비밀번호 *</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="현재 비밀번호 입력"
                                className="mt-1.5"
                            />
                        </div>
                        <Separator />
                        <div>
                            <Label className="text-sm font-medium">새 아이디</Label>
                            <Input
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="변경할 아이디 (선택)"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">새 비밀번호</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="변경할 비밀번호 (선택)"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">새 비밀번호 확인</Label>
                            <Input
                                type="password"
                                value={newPasswordConfirm}
                                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                placeholder="새 비밀번호 다시 입력"
                                className="mt-1.5"
                            />
                        </div>
                        {passwordError && (
                            <p className="text-sm text-red-500">{passwordError}</p>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={passwordSaving}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={changePassword} disabled={passwordSaving}>
                            {passwordSaving ? '변경 중...' : '변경'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenRestartBackendDialog} onOpenChange={setIsOpenRestartBackendDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>백엔드를 재시작할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            재시작이 완료될 때까지 출석부 화면이 표시되지 않을 수 있어요.
                        </AlertDialogDescription>
                        {restartBackendError && <p className="text-red-500 text-sm mt-2">{restartBackendError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRestartBackendError('')}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={wallpadRestartBackend}
                            ref={restartBackendButtonRef}
                        >
                            서비스 재시작
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenRebootDialog} onOpenChange={setIsOpenRebootDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 시스템을 재시작할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                            시스템을 재시작하려고 해요.<br />
                            웹 콘솔은 재시작이 완료되어야 다시 접속할 수 있어요.
                        </AlertDialogDescription>
                        {rebootError && <p className="text-red-500 text-sm mt-2">{rebootError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRebootError('')}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={wallpadReboot}
                            ref={rebootButtonRef}
                        >
                            시스템 재시작
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
