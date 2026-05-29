'use client'

import packageJSON from '../../package';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'react-loading-skeleton/dist/skeleton.css';
import Profile from './components/Profile';
import ProfileSkeleton from './components/ProfileSkeleton';
import NotifyWindow from './components/NotifyWindow';
import Advertisement from './components/Advertisement';
import AdvertisementSkeleton from './components/AdvertisementSkeleton';
import FlipClock from './components/FlipClock';
import NormalClock from './components/NormalClock';
import io from 'socket.io-client';

// Logo is always rendered at this fixed size on the main wallpad screen.
const LOGO_WIDTH = 185;
const LOGO_HEIGHT = 45;

// Design dimensions of <main>; match globals.css.
const DESIGN_WIDTH = 540;
const DESIGN_HEIGHT = 960;

const DEFAULT_THEME = { mode: 'light', darkStart: '19:00', darkEnd: '07:00' };

// Returns 'light' or 'dark' for the given theme config at the given time.
// In 'auto' mode the dark window may wrap past midnight (e.g. 19:00→07:00).
function resolveActiveScheme(theme, now = new Date()) {
  if (theme.mode === 'dark') return 'dark';
  if (theme.mode !== 'auto') return 'light';
  const toMin = (hhmm) => {
    const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const start = toMin(theme.darkStart);
  const end = toMin(theme.darkEnd);
  if (start === null || end === null || start === end) return 'light';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (start < end) return (nowMin >= start && nowMin < end) ? 'dark' : 'light';
  return (nowMin >= start || nowMin < end) ? 'dark' : 'light';
}

export default function Home() {
  const [notifyStatus, setNotifyStatus] = useState({});
  let [notifyLeftTime, setNotifyLeftTime] = useState(0);
  let [socketStatus, setSocketStatus] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [title, setTitle] = useState(null);
  const [adSectionTitle, setAdSectionTitle] = useState(null);
  const [logoSrcs, setLogoSrcs] = useState({ light: null, dark: null });
  const [statusCaption, setStatusCaption] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [activeScheme, setActiveScheme] = useState('light');
  const [clockStyle, setClockStyle] = useState('flip');
  const [displayScale, setDisplayScale] = useState('fit-width');
  // Extra rows appended to the currently-visible NotifyWindow by extensions
  // (via `ctx.notify(...)` in their handlers). Cleared on every new 'success'
  // event so messages from a previous notification never bleed into the next.
  const [appendedMessages, setAppendedMessages] = useState([]);
  const notifyTimeoutRef = useRef(null);
  // Original duration of the active notification — used to extend the
  // auto-dismiss timer when an append arrives mid-display.
  const notifyDurationRef = useRef(0);
  // Latest deadline timestamp, mirrored in a ref so socket handlers can
  // compare against it without having to be re-bound when state changes.
  const notifyLeftTimeRef = useRef(0);
  let socket = null;

  // Fetch the runtime-configurable title and logo from the backend. Both are
  // shown as skeletons until this resolves so a stale package.json title and
  // a stale bundled logo never flash on screen. Re-invoked on socket connect
  // so an offline-at-load page recovers once the backend becomes reachable.
  const fetchPublicConfig = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = `http://${window.location.hostname}:${packageJSON.config.socketioPort}/wallpad/config/public`;
    return fetch(url)
      .then(res => res.json())
      .then(body => {
        if (!body || !body.status) return;
        setTitle(body.title || '');
        setAdSectionTitle(body.adTitle || '');
        if (Array.isArray(body.memberStatusCaption)) {
          setStatusCaption(body.memberStatusCaption);
        }
        if (body.theme && typeof body.theme === 'object') {
          setTheme({ ...DEFAULT_THEME, ...body.theme });
        }
        if (body.clockStyle === 'flip' || body.clockStyle === 'normal') {
          setClockStyle(body.clockStyle);
        }
        if (['fit-width', 'fit-height', 'off'].includes(body.displayScale)) {
          setDisplayScale(body.displayScale);
        }
        if (body.logoUrls && typeof body.logoUrls === 'object') {
          const v = body.logoVersion || 0;
          const base = `http://${window.location.hostname}:${packageJSON.config.socketioPort}`;
          setLogoSrcs({
            light: body.logoUrls.light ? `${base}${body.logoUrls.light}?v=${v}` : null,
            dark: body.logoUrls.dark ? `${base}${body.logoUrls.dark}?v=${v}` : null,
          });
        }
      })
      .catch(err => console.error('[config/public] fetch failed', err))
      .finally(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    fetchPublicConfig();
  }, [fetchPublicConfig]);

  // Apply the resolved color scheme as data-theme on <html>. Scoped to this
  // page: cleanup removes the attribute, so navigating to /settings reverts
  // to the light defaults declared on :root.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const apply = () => {
      const scheme = resolveActiveScheme(theme);
      setActiveScheme(scheme);
      document.documentElement.setAttribute('data-theme', scheme);
    };
    apply();
    // In auto mode the active scheme depends on wall-clock time, so re-check
    // each minute to catch the darkStart/darkEnd boundaries.
    const intervalId = theme.mode === 'auto' ? setInterval(apply, 60_000) : null;
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);

  // Scale <main> according to the displayScale setting. Re-runs whenever the
  // setting changes. Multiple triggers keep the scale fresh across resize,
  // orientation, visibility, and a periodic safety net.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applyScale = () => {
      let scale;
      if (displayScale === 'fit-height') scale = window.innerHeight / DESIGN_HEIGHT;
      else if (displayScale === 'off') scale = 1;
      else scale = window.innerWidth / DESIGN_WIDTH; // fit-width
      document.documentElement.style.setProperty('--app-scale', String(scale));
    };
    applyScale();
    window.addEventListener('resize', applyScale);
    window.addEventListener('orientationchange', applyScale);
    document.addEventListener('visibilitychange', applyScale);
    const ro = new ResizeObserver(applyScale);
    ro.observe(document.documentElement);
    const safetyInterval = setInterval(applyScale, 2000);
    return () => {
      window.removeEventListener('resize', applyScale);
      window.removeEventListener('orientationchange', applyScale);
      document.removeEventListener('visibilitychange', applyScale);
      ro.disconnect();
      clearInterval(safetyInterval);
    };
  }, [displayScale]);

  // state variable which has current member object array to show.
  let [memberStatus, setMemberStatus] = useState(Array(9).fill({
    isSkeleton: true
  }));

  const showNotification = (duration) => {
    notifyDurationRef.current = duration;
    const deadline = new Date().getTime() + duration;
    notifyLeftTimeRef.current = deadline;
    setNotifyLeftTime(deadline);
  };

  useEffect(() => {
    notifyLeftTimeRef.current = notifyLeftTime;

    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
      notifyTimeoutRef.current = null;
    }

    if (notifyLeftTime <= 0) return;

    const remaining = notifyLeftTime - Date.now();
    if (remaining <= 0) {
      setNotifyLeftTime(0);
      return;
    }

    notifyTimeoutRef.current = setTimeout(() => {
      setNotifyLeftTime(0);
      setAppendedMessages([]);
    }, remaining);

    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
        notifyTimeoutRef.current = null;
      }
    };
  }, [notifyLeftTime]);

  /* ========== start socket.io setup ========== */
  useEffect(() => {
    socket = io(packageJSON.config.socketio, {
      cors: {
        origin: "http://localhost:5000",
        methods: ["GET", "POST"]
      }
    });

    let isConnected = false;

    socket.on('connect', () => {
      console.log('successfully connected to socket.io server.');
      // always hide notification on connect (clears disconnect error popup)
      setNotifyLeftTime(0);
      if (isConnected) {
        // reconnected after a disconnection — reload the page
        console.log('Reconnected to server. Reloading page...');
        location.reload();
        return;
      }
      isConnected = true;
      socket.emit('getMemberStat');
      setSocketStatus(true);
      // Re-fetch title/logo in case the initial fetch failed (backend was
      // offline when the page first loaded — reconnect path uses reload()).
      fetchPublicConfig();
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket.IO disconnected:', reason);
      setSocketStatus(false);
      setNotifyStatus({ custom: { title: '페이지를 표시할 수 없어요', message: '서버 연결이 중단되어 서비스가 중지되었어요.\n다시 연결될 때까지 잠시만 기다려 주세요.' } });
      setMemberStatus(Array(9).fill({ isSkeleton: true }));
      setNotifyLeftTime(Date.now() + 60 * 60 * 1000); // keep showing for a long time until reconnect
    });

    socket.on('success', data => {
      console.log(`[SCEvent] duration: ${data.duration}, name: ${data.name}, status: ${data.status}`);
      socket.emit('getMemberStat');
      setAppendedMessages([]);
      setNotifyStatus(data);
      showNotification(data.duration);
    });

    socket.on('error', error => {
      console.error(`[SCEvent] duration: ${error.duration}, name: ${error.name}, status: ${error.status}`);
      setAppendedMessages([]);
      setNotifyStatus(error);
      showNotification(error.duration);
    });

    // Extension → ctx.notify(...) → backend forwards as `notifyAppend`.
    // Each message becomes an extra row inside the current NotifyWindow,
    // and the auto-dismiss timer is bumped to `now + originalDuration` so
    // the appended content has time to actually be read.
    socket.on('notifyAppend', payload => {
      const message = payload && typeof payload.message === 'string' ? payload.message : '';
      if (!message.trim()) return;
      // Drop appends arriving after the notification has already been
      // dismissed — otherwise a slow extension would resurrect stale UI.
      if (notifyLeftTimeRef.current <= Date.now()) return;
      setAppendedMessages(prev => [...prev, message]);
      const duration = notifyDurationRef.current || 0;
      if (duration > 0) {
        const newDeadline = Date.now() + duration;
        notifyLeftTimeRef.current = newDeadline;
        setNotifyLeftTime(newDeadline);
      }
    });

    socket.on('getMemberStatResp', userData => {
      console.log(userData);
      setMemberStatus(userData);
    });

    socket.on('reqFrontendRefresh', () => {
      console.log('Page is being refreshed now..');
      location.reload();
    });

    socket.on('themeUpdate', (newTheme) => {
      if (newTheme && typeof newTheme === 'object') {
        setTheme({ ...DEFAULT_THEME, ...newTheme });
      }
    });

    socket.on('clockStyleUpdate', (newStyle) => {
      if (newStyle === 'flip' || newStyle === 'normal') {
        setClockStyle(newStyle);
      }
    });

    socket.on('displayScaleUpdate', (val) => {
      if (['fit-width', 'fit-height', 'off'].includes(val)) {
        setDisplayScale(val);
      }
    });

    return () => {
      if (socket) socket.disconnect();
    }
  }, []);
  /* ========== end socket.io setup ========== */

  return (
    <>
      {(() => {
        // notification window section.
        if (notifyLeftTime > 0 && Date.now() <= notifyLeftTime)
          return (
            <NotifyWindow
              type={notifyStatus.status}
              name={notifyStatus.name || null}
              timesTaken={notifyStatus.timesTaken}
              balance={notifyStatus.balance || null}
              custom={notifyStatus.custom || null}
              appendedMessages={appendedMessages}
            />
          );
      })()}
      <main className='flex flex-col p-9 justify-between bg-[var(--wp-bg)] rounded-2xl'>
        <section>
          <section className='flex justify-between items-center'>
            <div
              style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT, overflow: 'hidden' }}
              className='shrink-0 rounded-lg'
            >
              {(() => {
                // Prefer the variant matching the active scheme; fall back to the
                // other variant if the admin only uploaded one.
                const resolvedLogo = logoSrcs[activeScheme] || logoSrcs.light || logoSrcs.dark;
                if (configLoaded && resolvedLogo) {
                  return (
                    <img
                      src={resolvedLogo}
                      alt="Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  );
                }
                return (
                  <div
                    style={{ width: '100%', height: '100%' }}
                    className='bg-[var(--wp-surface)] animate-pulse rounded-lg'
                  />
                );
              })()}
            </div>
            {clockStyle === 'normal' ? <NormalClock /> : <FlipClock />}
          </section>
          <div className='mt-7 mb-3'>
            {configLoaded && title !== null ? (
              <p className='text-2xl font-bold'>{title}</p>
            ) : (
              <div
                style={{ width: '320px', height: '32px' }}
                className='bg-[var(--wp-surface)] animate-pulse rounded-lg'
              />
            )}
          </div>
          <div className='flex flex-wrap justify-start gap-4'>
            {/* the section that shows member profile. */}
            {(() => {
              if (!Array.isArray(memberStatus)) {
                console.error("memberStatus is not an array", memberStatus);
                return null;
              }

              return memberStatus.map((user, index) => {
                if (user.isSkeleton) return (
                  <ProfileSkeleton
                    key={`skeleton-${index}`}
                  />
                )

                return (
                  <Profile
                    name={user.name}
                    position={user.position}
                    status={user.status}
                    statusCaption={statusCaption}
                    emoji={user.emoji}
                    github={user.github}
                    isAbsent={user.status != 1}
                    key={index}
                    isSkeleton={user.isSkeleton}
                  />
                )
              })
            })()}
          </div>
        </section>

        <footer>
          <div className="mb-[1.65rem]">
            <div className='text-2xl font-bold mt-7 mb-3'>
              {configLoaded && adSectionTitle !== null ? (
                <p className='text-2xl font-bold'>{adSectionTitle}</p>
              ) : (
                <div
                  style={{ width: '320px', height: '32px' }}
                  className='bg-[var(--wp-surface)] animate-pulse rounded-lg'
                />
              )}
            </div>
            {
              socketStatus ?
                <Advertisement /> :
                <AdvertisementSkeleton />
            }
          </div>
          <div className='flex justify-center items-center bg-[var(--wp-surface)] rounded-2xl overflow-hidden w-full h-[8.5rem]'>
            <div className={`flex justify-center items-center rounded-full bg-[var(--wp-accent)] ` +
              `${socketStatus ? 'w-[2rem] h-[2rem] animation-pulse' : ''}`} />
            <p className='absolute font-medium align-center tracking-tight'>
              {
                socketStatus ?
                  '이곳에 ID 카드를 대주세요' :
                  '서비스를 시작하고 있어요'
              }
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
