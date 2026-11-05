import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Camera, 
  Monitor, 
  Building2, 
  Briefcase, 
  Phone, 
  Mail, 
  Send, 
  MapPin, 
  Crown, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Sparkles,
  Clock,
  CreditCard,
  Navigation,
  Gauge
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { uploadTaskFile, requestChiefAccess, fetchAccessRequests } from '../lib/api';

const PRESET_COLORS = [
  '#ff6600', '#ff8800', '#f59e0b', '#10b981',
  '#0284c7', '#00a3ff', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#ef4444',
  '#06b6d4', '#059669', '#475569', '#64748b'
];

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  departments = DEPARTMENTS,
  onSaveProfile,
  showToast
}) {
  const [fullName, setFullName] = useState('');
  const [deptId, setDeptId] = useState('dept-design');
  const [role, setRole] = useState('');
  const [workstation, setWorkstation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [officeRoom, setOfficeRoom] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [avatarColor, setAvatarColor] = useState('#ff6600');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initials, setInitials] = useState('');

  // Profile and Fuel Card Tab
  const [activeProfileTab, setActiveProfileTab] = useState('profile'); // 'profile' | 'fuel_card'
  const [fuelTrips, setFuelTrips] = useState(() => {
    return Array.isArray(currentUser?.fuel_trips) ? currentUser.fuel_trips : [
      { id: 'trip-1', date: '2026-11-02', address: 'г. Москва, ул. Арбат, 24', km: 48, liters: 4.1, task_id: 'task-101', task_title: 'Обследование узла ВОЛС' },
      { id: 'trip-2', date: '2026-11-04', address: 'г. Красногорск, ул. Ленина, 15', km: 62, liters: 5.3, task_id: 'task-104', task_title: 'Согласование кабельного ввода' }
    ];
  });

  // Access request state
  const [requestNote, setRequestNote] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.full_name || '');
      setDeptId(currentUser.department_id || 'dept-design');
      setRole(currentUser.role || 'Инженер');
      setWorkstation(currentUser.workstation_id || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setTelegram(currentUser.telegram || '');
      setOfficeRoom(currentUser.office_room || '');
      setSpecialty(currentUser.specialty || '');
      setAvatarColor(currentUser.avatar_color || '#ff6600');
      setAvatarUrl(currentUser.avatar_url || '');
      setInitials(currentUser.initials || '');
      setRequestNote('');

      // Check if user has an active pending request
      fetchAccessRequests().then((reqs) => {
        const myPending = Array.isArray(reqs) && reqs.some(
          (r) => r.user_id === currentUser.id && r.status === 'pending'
        );
        setHasPendingRequest(myPending);
      }).catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const userLevel = Number(currentUser.role_level) || 6;
  const isChiefOrAdmin = userLevel >= 10 || currentUser.full_name?.toLowerCase() === 'admin';

  // Compute initials automatically if left empty
  const computedInitials = initials.trim() ? initials.trim().toUpperCase() : (() => {
    if (!fullName.trim()) return 'УФ';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  })();

  // Handle Photo File Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Выберите изображение (PNG, JPG, WEBP)', '⚠️');
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploaded = await uploadTaskFile(file, currentUser.full_name);
      if (uploaded?.url) {
        setAvatarUrl(uploaded.url);
        playSound('success');
        if (showToast) showToast('Фото профиля успешно загружено', '📸');
      }
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
      if (showToast) showToast('Не удалось загрузить фото на сервер', '⚠️');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Request Level 10 Access
  const handleSendAccessRequest = async (e) => {
    e.preventDefault();
    setRequestSending(true);
    try {
      await requestChiefAccess({
        note: requestNote,
        requestedRole: 'Начальник отдела (Ур. 10)'
      });
      setHasPendingRequest(true);
      playSound('success');
      if (showToast) showToast('Заявка на права начальника отправлена администратору!', '👑');
    } catch (err) {
      console.error('Ошибка отправки заявки:', err);
      if (showToast) showToast('Не удалось отправить заявку', '⚠️');
    } finally {
      setRequestSending(false);
    }
  };

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      let normPc = workstation.trim().toLowerCase();
      if (normPc && !normPc.startsWith('vlxproject')) {
        normPc = `vlxproject${normPc.padStart(2, '0')}`;
      }

      const updatedProfile = {
        ...currentUser,
        full_name: fullName.trim(),
        department_id: deptId,
        role: role.trim() || 'Инженер',
        workstation_id: normPc,
        phone: phone.trim(),
        email: email.trim(),
        telegram: telegram.trim(),
        office_room: officeRoom.trim(),
        specialty: specialty.trim(),
        avatar_color: avatarColor,
        avatar_url: avatarUrl || null,
        initials: computedInitials,
        fuel_trips: fuelTrips
      };

      if (normPc) {
        localStorage.setItem('kaban_workstation', normPc);
      }

      if (onSaveProfile) {
        await onSaveProfile(updatedProfile);
      }
      playSound('success');
      if (showToast) showToast('Профиль успешно сохранен', '✓');
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      if (showToast) showToast('Ошибка сохранения профиля', '⚠️');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-modal, #141824)',
          borderRadius: 'var(--radius-xl, 18px)',
          border: '1px solid var(--border-subtle, #334155)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #0f172a)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #f8fafc)' }}>
                Профиль сотрудника • Настройка аккаунта
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                АО «Уфанет» • Персональные данные, фото, рабочее место и уровень прав
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Закрыть"
            style={{ width: 32, height: 32 }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Profile Tabs: Profile Details vs Fuel Card */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', padding: '0 1.4rem' }}>
          <button
            type="button"
            onClick={() => setActiveProfileTab('profile')}
            style={{
              padding: '0.65rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeProfileTab === 'profile' ? '2.5px solid #ff6600' : '2.5px solid transparent',
              color: activeProfileTab === 'profile' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
              fontWeight: activeProfileTab === 'profile' ? 700 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={15} />
            <span>Данные профиля</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProfileTab('fuel_card')}
            style={{
              padding: '0.65rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeProfileTab === 'fuel_card' ? '2.5px solid #ff6600' : '2.5px solid transparent',
              color: activeProfileTab === 'fuel_card' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
              fontWeight: activeProfileTab === 'fuel_card' ? 700 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CreditCard size={15} />
            <span>Топливная карта (ГСМ)</span>
            <span style={{ fontSize: '0.68rem', background: 'rgba(255, 102, 0, 0.18)', color: '#ff6600', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
              АИ-95
            </span>
          </button>
        </div>

        {/* Modal Body */}
        {activeProfileTab === 'fuel_card' ? (
          <div style={{ padding: '1.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {/* Virtual Card Graphic */}
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                margin: '0 auto',
                borderRadius: '16px',
                padding: '1.4rem',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1.5px solid rgba(255, 102, 0, 0.4)',
                boxShadow: '0 14px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 102, 0, 0.15)',
                color: '#fff',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '210px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 900, color: '#ff6600', letterSpacing: '0.05em', fontSize: '0.95rem' }}>УФАНЕТ</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255, 102, 0, 0.2)', padding: '2px 6px', borderRadius: '6px', color: '#ff8800', fontWeight: 800 }}>
                    ТОПЛИВНАЯ КАРТА
                  </span>
                </div>
                <CreditCard size={22} style={{ color: '#ff6600' }} />
              </div>

              {/* Card Chip & Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0.4rem 0' }}>
                <div style={{ width: 36, height: 26, borderRadius: '5px', background: 'linear-gradient(135deg, #eab308, #ca8a04)', border: '1px solid #fef08a' }} />
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Безналичный расчет ГСМ • АИ-95</span>
              </div>

              {/* Card Number */}
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.15rem', letterSpacing: '0.12em', fontWeight: 700, color: '#f8fafc' }}>
                ТК-7704 5412 {(currentUser.workstation_id?.replace(/\D/g, '') || '01').padStart(2, '0')}00 9500
              </div>

              {/* Footer: Cardholder & Base */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.74rem' }}>
                <div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>Держатель карты</div>
                  <div style={{ fontWeight: 800, color: '#fff' }}>{fullName || currentUser.full_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase' }}>База выезда</div>
                  <div style={{ fontWeight: 700, color: '#cbd5e1' }}>Одинцово, БЦ Телеграф</div>
                </div>
              </div>
            </div>

            {/* Monthly Consumption Statistics */}
            {(() => {
              const totalKm = fuelTrips.reduce((s, t) => s + (Number(t.km) || 0), 0);
              const totalLiters = (totalKm * 0.085).toFixed(1);
              const limitLiters = 150;
              const remainingLiters = Math.max(0, limitLiters - Number(totalLiters)).toFixed(1);
              const percentUsed = Math.min(100, Math.round((Number(totalLiters) / limitLiters) * 100));

              return (
                <div style={{ background: 'var(--bg-secondary, #0f172a)', border: '1px solid var(--border-subtle, #334155)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Gauge size={16} style={{ color: '#ff6600' }} />
                      <span>Расход топлива за Ноябрь 2026 (Норма 8.5 л / 100 км)</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff8800' }}>
                      {percentUsed}% от лимита
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ width: `${percentUsed}%`, height: '100%', background: percentUsed > 90 ? '#ef4444' : 'linear-gradient(90deg, #ff6600, #ff8800)', transition: 'width 0.3s ease' }} />
                  </div>

                  {/* 3 Metric Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255, 102, 0, 0.08)', border: '1px solid rgba(255, 102, 0, 0.25)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Пробег выездов</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ff6600' }}>{totalKm} км</div>
                    </div>
                    <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Списано АИ-95</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>{totalLiters} л</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Остаток лимита</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>{remainingLiters} л</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Trip Log Table */}
            <div style={{ background: 'var(--bg-secondary, #0f172a)', border: '1px solid var(--border-subtle, #334155)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Navigation size={15} style={{ color: '#10b981' }} />
                  <span>История поездок и выездов на объекты</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Отправная точка: БЦ «Телеграф», ул. Молодёжная, 46
                </span>
              </div>

              {fuelTrips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Поездок пока не зафиксировано. При завершении карточки с отметкой «🚗 Требует выезд» километраж записывается сюда автоматически.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fuelTrips.map((trip) => (
                    <div
                      key={trip.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🚗 {trip.address}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {trip.date} • {trip.task_title || trip.task_id || 'Выезд на объект'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#ff6600' }}>{trip.km} км</div>
                        <div style={{ fontSize: '0.68rem', color: '#38bdf8' }}>{trip.liters} л АИ-95</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ padding: '0.55rem 1.35rem', fontSize: '0.82rem', fontWeight: 800 }}
              >
                <Check size={16} />
                <span>Сохранить данные</span>
              </button>
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleSave}
          style={{
            padding: '1.4rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            flex: 1
          }}
        >
          {/* 1. Avatar & Quick Info Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '1rem',
              background: 'var(--bg-secondary, #0f172a)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--border-subtle, #334155)',
              position: 'relative'
            }}
          >
            {/* Avatar Preview */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--accent-orange, #ff6600)',
                    boxShadow: '0 4px 15px rgba(255, 102, 0, 0.3)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: avatarColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    boxShadow: `0 4px 15px ${avatarColor}55`,
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {computedInitials}
                </div>
              )}

              {/* Upload Photo Button Overlay */}
              <label
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: 'var(--accent-orange, #ff6600)',
                  color: '#fff',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: uploadingPhoto ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'transform 0.15s ease'
                }}
                title="Загрузить фото профиля"
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  style={{ display: 'none' }}
                />
                <Camera size={14} />
              </label>
            </div>

            {/* Avatar details & colors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                  {fullName || 'ФИО сотрудника'}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: isChiefOrAdmin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                    color: isChiefOrAdmin ? '#ef4444' : '#38bdf8'
                  }}
                >
                  {isChiefOrAdmin ? <Crown size={12} /> : <ShieldCheck size={12} />}
                  <span>Уровень {userLevel}: {isChiefOrAdmin ? 'Начальник / Администратор' : 'Сотрудник'}</span>
                </div>
              </div>

              {/* Photo Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <label
                  className="btn btn-secondary"
                  style={{
                    padding: '0.28rem 0.65rem',
                    fontSize: '0.72rem',
                    cursor: uploadingPhoto ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{ display: 'none' }}
                  />
                  <Upload size={12} />
                  <span>{uploadingPhoto ? 'Загрузка...' : 'Загрузить фото'}</span>
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.28rem 0.65rem',
                      fontSize: '0.72rem',
                      color: 'var(--accent-rose, #ef4444)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Удалить фото и использовать инициалы"
                  >
                    <Trash2 size={12} />
                    <span>Удалить фото</span>
                  </button>
                )}
              </div>

              {/* Avatar Preset Colors */}
              {!avatarUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Цвет:</span>
                  {PRESET_COLORS.slice(0, 10).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: c,
                        border: avatarColor === c ? '2px solid #fff' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Main Profile Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Full Name */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                ФИО сотрудника: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Отдел компании:
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.fullName || d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Job Title / Role */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Должность:
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Ведущий инженер-проектировщик"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Workstation PC Name */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Имя рабочего ПК (Авторизация без пароля):
              </label>
              <div style={{ position: 'relative' }}>
                <Monitor size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />
                <input
                  type="text"
                  placeholder="vlxproject04 (или просто 04)"
                  value={workstation}
                  onChange={(e) => setWorkstation(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '2.2rem',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#38bdf8'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                💡 Система автоматически распознает компьютер и сразу авторизует вас
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Внутренний телефон / доб.:
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="доб. 452 или +7 (347) ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Корпоративная почта:
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  placeholder="ivanov@ufanet.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Telegram / Messenger */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Telegram / Мессенджер:
              </label>
              <div style={{ position: 'relative' }}>
                <Send size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="@telegram_login"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Office / Room */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Кабинет / Место в офисе:
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Кабинет 302 / Рабочее место 4"
                  value={officeRoom}
                  onChange={(e) => setOfficeRoom(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
              Направления и специализация:
            </label>
            <input
              type="text"
              placeholder="ВОЛС, СКС, ККС, ВДН, Видеонаблюдение..."
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* 3. Chief Access Request Banner (If user is not Level 10) */}
          {!isChiefOrAdmin && (
            <div
              style={{
                padding: '1.1rem',
                borderRadius: 'var(--radius-lg, 12px)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255, 102, 0, 0.08) 100%)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Crown size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                      Права начальника отдела (Уровень 10)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Позволяет подтверждать инженеров отдела, изменять матрицу прав, настраивать колонки и разделы
                    </div>
                  </div>
                </div>

                {hasPendingRequest ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    <Clock size={14} />
                    <span>Заявка отправлена • Ожидает решения</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendAccessRequest}
                    disabled={requestSending}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.45rem 0.9rem',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    <Crown size={14} />
                    <span>{requestSending ? 'Отправка...' : 'Запросить доступ начальника (Ур. 10)'}</span>
                  </button>
                )}
              </div>

              {!hasPendingRequest && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Комментарий к заявке (например: Назначен руководителем группы...)"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    className="form-input"
                    style={{
                      flex: 1,
                      fontSize: '0.78rem',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.4rem 0.75rem'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem' }}
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.35rem', fontSize: '0.82rem', fontWeight: 800 }}
            >
              <Check size={16} />
              <span>{saving ? 'Сохранение...' : 'Сохранить профиль'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
