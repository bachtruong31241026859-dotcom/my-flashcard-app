'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ModeType = 'daily' | 'ielts' | 'business';
type TabType = 'search' | 'saved' | 'practice';
type FilterType = 'all' | 'daily' | 'ielts' | 'business' | 'learning' | 'mastered';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [word, setWord] = useState('');
  const [mode, setMode] = useState<ModeType>('ielts');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auth States
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Saved Flashcards States
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<FilterType>('all');

  // Practice Mode States
  const [practiceQueue, setPracticeQueue] = useState<any[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isPracticeFlipped, setIsPracticeFlipped] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgottenCount, setForgottenCount] = useState(0);
  const [practiceFinished, setPracticeFinished] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'saved' || activeTab === 'practice') {
      fetchSavedCards();
    }
  }, [activeTab, user]);

  const fetchSavedCards = async () => {
    setLoadingCards(true);
    try {
      const url = user ? `/api/flashcards?user_id=${user.id}` : '/api/flashcards';
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setSavedCards(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải từ vựng:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    setResult(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, mode }),
      });

      if (!res.ok) {
        alert(`Lỗi Server (${res.status}): Vui lòng kiểm tra lại file API!`);
        return;
      }

      const data = await res.json();
      if (data.data) {
        setResult(data.data);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi tra từ!');
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message || 'Không thể kết nối tới server AI'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const displayTag = mode === 'daily' ? 'Giao tiếp' : mode === 'business' ? 'Công sở' : 'IELTS';

      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: result.word,
          ipa: result.ipa,
          part_of_speech: `${result.partOfSpeech || result.part_of_speech || 'Vocabulary'} • [${displayTag}]`,
          vietnamese_meaning: result.vietnamese_meaning,
          examples_json: result.examples,
          user_id: user ? user.id : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        fetchSavedCards();
      } else {
        alert('Lỗi khi lưu: ' + data.error);
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ lưu trữ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa từ vựng này khỏi bộ thẻ?')) return;

    try {
      const res = await fetch(`/api/flashcards?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSavedCards(savedCards.filter((card) => card.id !== id));
      } else {
        alert('Lỗi khi xóa: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi hệ thống khi xóa!');
    }
  };

  const speakWord = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Đăng ký thành công! Hãy kiểm tra Email của bạn để xác nhận tài khoản.');
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại!');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Bộ lọc thẻ
  const filteredCards = savedCards.filter((card) => {
    if (cardFilter === 'all') return true;
    if (cardFilter === 'learning') return card.status !== 'mastered';
    if (cardFilter === 'mastered') return card.status === 'mastered';

    const tagMap = {
      daily: '[Giao tiếp]',
      ielts: '[IELTS]',
      business: '[Công sở]',
    };
    return card.part_of_speech?.includes(tagMap[cardFilter as keyof typeof tagMap]);
  });

  // Thuật toán Ôn tập thông minh
  const startPractice = () => {
    if (savedCards.length === 0) return;

    const cardsToPractice = [...savedCards].sort((a, b) => {
      if ((a.status || 'learning') === 'learning' && b.status === 'mastered') return -1;
      if (a.status === 'mastered' && (b.status || 'learning') === 'learning') return 1;

      const timeA = new Date(a.last_reviewed || 0).getTime();
      const timeB = new Date(b.last_reviewed || 0).getTime();
      return timeA - timeB;
    });

    setPracticeQueue(cardsToPractice);
    setPracticeIndex(0);
    setIsPracticeFlipped(false);
    setRememberedCount(0);
    setForgottenCount(0);
    setPracticeFinished(false);
  };

  // Xử lý khi bấm Nhớ/Quên -> Lưu vào Database
  const handleAnswer = async (remembered: boolean) => {
    const currentCard = practiceQueue[practiceIndex];
    if (!currentCard) return;

    const newStatus = remembered ? 'mastered' : 'learning';

    if (remembered) {
      setRememberedCount((prev) => prev + 1);
    } else {
      setForgottenCount((prev) => prev + 1);
    }

    try {
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCard.id,
          status: newStatus,
        }),
      });

      setSavedCards((prev) =>
        prev.map((card) =>
          card.id === currentCard.id
            ? { ...card, status: newStatus, last_reviewed: new Date().toISOString() }
            : card
        )
      );
    } catch (err) {
      console.error('Không thể lưu trạng thái ôn tập:', err);
    }

    if (practiceIndex + 1 < practiceQueue.length) {
      setIsPracticeFlipped(false);
      setPracticeIndex((prev) => prev + 1);
    } else {
      setPracticeFinished(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">⚡</div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Smart Flashcard AI
          </h1>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 space-x-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'search'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔍 Tra Từ
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'saved'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎴 Bộ Thẻ ({savedCards.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('practice');
              if (practiceQueue.length === 0) startPractice();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'practice'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎮 Luyện Tập
          </button>
        </div>

        <div>
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-slate-800 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                👤 {user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-red-400 transition"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-slate-950 transition"
            >
              🔑 Đăng nhập
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        {/* TAB 1: TRA TỪ AI */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 p-2 rounded-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium px-2">🎯 Chế độ học:</span>
              <div className="flex gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setMode('daily')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    mode === 'daily'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🗣️ Giao tiếp đời thường
                </button>
                <button
                  type="button"
                  onClick={() => setMode('ielts')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    mode === 'ielts'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎓 Ôn thi IELTS
                </button>
                <button
                  type="button"
                  onClick={() => setMode('business')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    mode === 'business'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💼 Tiếng Anh Công sở
                </button>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Nhập từ vựng (Ví dụ: mitigate, negotiate, slang...)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Đang phân tích...' : 'Tra Từ AI'}
              </button>
            </form>

            {result && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-md">
                      {result.partOfSpeech || result.part_of_speech}
                    </span>
                    <h2 className="text-4xl font-extrabold text-white mt-2 flex items-center gap-3">
                      {result.word}
                      <button
                        onClick={() => speakWord(result.word)}
                        className="text-lg bg-slate-700/60 hover:bg-slate-600 p-2 rounded-full text-emerald-400 transition"
                        title="Phát âm"
                      >
                        🔊
                      </button>
                    </h2>
                    <p className="text-slate-400 font-mono mt-1">{result.ipa}</p>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || savedSuccess}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                      savedSuccess
                        ? 'bg-slate-700 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {savedSuccess ? '✓ Đã Lưu Vô Bộ Thẻ' : saving ? 'Đang lưu...' : '+ Lưu vào Bộ Thẻ'}
                  </button>
                </div>

                <div className="border-t border-slate-700/60 pt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nghĩa tiếng Việt</h3>
                  <p className="text-xl font-medium text-emerald-300 mt-1">{result.vietnamese_meaning}</p>
                </div>

                {result.examples && result.examples.length > 0 && (
                  <div className="border-t border-slate-700/60 pt-4 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ví dụ ngữ cảnh:</h3>
                    {result.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 relative">
                        {ex.band && (
                          <span className="text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded font-bold mb-1 inline-block">
                            {ex.band}
                          </span>
                        )}
                        <p className="text-slate-200 font-medium text-sm mt-0.5">"{ex.en}"</p>
                        <p className="text-slate-400 text-xs mt-1">👉 {ex.vi}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BỘ THẺ ĐÃ LƯU */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-white">🎴 Thẻ từ vựng của bạn</h2>

              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-medium flex-wrap gap-1">
                <button
                  onClick={() => setCardFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    cardFilter === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả ({savedCards.length})
                </button>
                <button
                  onClick={() => setCardFilter('learning')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    cardFilter === 'learning' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🟡 Đang học
                </button>
                <button
                  onClick={() => setCardFilter('mastered')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    cardFilter === 'mastered' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🟢 Đã thuộc
                </button>
                <button
                  onClick={() => setCardFilter('ielts')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    cardFilter === 'ielts' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎓 IELTS
                </button>
              </div>
            </div>

            {loadingCards ? (
              <div className="text-center py-12 text-slate-500">Đang tải bộ thẻ từ vựng...</div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-base">Không tìm thấy từ vựng nào phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCards.map((card) => {
                  const isFlipped = flippedCardId === card.id;
                  const isMastered = card.status === 'mastered';

                  return (
                    <div key={card.id} className="[perspective:1000px] h-[280px]">
                      <div
                        onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                        className={`relative w-full h-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        {/* MẶT TRƯỚC */}
                        <div className="absolute inset-0 w-full h-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-5 flex flex-col justify-between [backface-visibility:hidden]">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                              {card.part_of_speech || 'Vocabulary'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  isMastered
                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
                                    : 'bg-amber-950/80 text-amber-400 border-amber-700'
                                }`}
                              >
                                {isMastered ? '🟢 Đã thuộc' : '🟡 Đang học'}
                              </span>

                              <button
                                onClick={(e) => speakWord(card.word, e)}
                                className="text-xs bg-slate-700/60 hover:bg-slate-600 p-1.5 rounded-full text-emerald-400"
                              >
                                🔊
                              </button>
                              <button
                                onClick={(e) => handleDeleteCard(card.id, e)}
                                className="text-xs text-slate-500 hover:text-red-400 p-1.5"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div className="text-center my-auto">
                            <h3 className="text-3xl font-extrabold text-white tracking-wide">{card.word}</h3>
                            {card.ipa && <p className="text-slate-400 font-mono text-sm mt-1">{card.ipa}</p>}
                          </div>

                          <div className="text-[10px] text-center text-slate-500 font-medium">
                            👆 Chạm để xoay 3D xem nghĩa
                          </div>
                        </div>

                        {/* MẶT SAU */}
                        <div className="absolute inset-0 w-full h-full bg-slate-800/95 border border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Nghĩa & Ví dụ</span>
                            <button
                              onClick={(e) => speakWord(card.word, e)}
                              className="text-xs bg-slate-700/60 hover:bg-slate-600 p-1.5 rounded-full text-emerald-400"
                            >
                              🔊
                            </button>
                          </div>

                          <div className="my-auto space-y-2">
                            <p className="text-lg font-bold text-emerald-300">{card.vietnamese_meaning}</p>
                            {card.examples_json && card.examples_json.length > 0 && (
                              <div className="pt-2 border-t border-slate-700/60 max-h-[130px] overflow-y-auto space-y-1.5 pr-1">
                                {card.examples_json.map((ex: any, idx: number) => (
                                  <div key={idx} className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/40">
                                    <p className="text-xs text-slate-200">"{ex.en}"</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">👉 {ex.vi}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] text-center text-slate-500 font-medium">
                            Chạm để xoay về mặt trước
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHẾ ĐỘ LUYỆN ÔN TẬP THÔNG MINH */}
        {activeTab === 'practice' && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">🎮 Luyện Tập Ôn Thẻ</h2>
                <p className="text-xs text-slate-400">Thuật toán ưu tiên đẩy các từ chưa thuộc lên trước</p>
              </div>
              <button
                onClick={startPractice}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                🔄 Ôn Lại Từ Đầu
              </button>
            </div>

            {savedCards.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-base">Bạn cần lưu ít nhất 1 từ vựng để bắt đầu luyện tập.</p>
              </div>
            ) : practiceFinished ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
                <div className="text-5xl">🎉</div>
                <h3 className="text-2xl font-extrabold text-white">Hoàn Thành Buổi Ôn Tập!</h3>
                <p className="text-slate-400 text-sm">Trạng thái ghi nhớ của các từ đã được đồng bộ vào Database:</p>

                <div className="grid grid-cols-2 gap-4 my-6">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30">
                    <span className="text-2xl font-black text-emerald-400">{rememberedCount}</span>
                    <p className="text-xs text-slate-400 mt-1">Đánh dấu Đã thuộc 🟢</p>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-red-500/30">
                    <span className="text-2xl font-black text-red-400">{forgottenCount}</span>
                    <p className="text-xs text-slate-400 mt-1">Cần Ôn Tiếp 🟡</p>
                  </div>
                </div>

                <button
                  onClick={startPractice}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg"
                >
                  🔁 Ôn Lại Tiếp
                </button>
              </div>
            ) : practiceQueue.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Thẻ thứ {practiceIndex + 1} / {practiceQueue.length}</span>
                  <span className="text-amber-400 font-semibold">
                    {practiceQueue[practiceIndex]?.status === 'mastered' ? '🟢 Từ đã thuộc' : '🟡 Từ đang học'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${((practiceIndex + 1) / practiceQueue.length) * 100}%` }}
                  ></div>
                </div>

                {/* THẺ 3D */}
                <div className="[perspective:1000px] h-[320px]">
                  <div
                    onClick={() => setIsPracticeFlipped(!isPracticeFlipped)}
                    className={`relative w-full h-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer ${
                      isPracticeFlipped ? '[transform:rotateY(180deg)]' : ''
                    }`}
                  >
                    {/* MẶT TRƯỚC */}
                    <div className="absolute inset-0 w-full h-full bg-slate-800 border-2 border-slate-700 hover:border-slate-600 rounded-2xl p-6 flex flex-col justify-between text-center [backface-visibility:hidden]">
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded self-center">
                        {practiceQueue[practiceIndex]?.part_of_speech || 'Vocabulary'}
                      </span>

                      <div className="my-auto">
                        <h3 className="text-4xl font-black text-white tracking-wide">
                          {practiceQueue[practiceIndex]?.word}
                        </h3>
                        {practiceQueue[practiceIndex]?.ipa && (
                          <p className="text-slate-400 font-mono text-base mt-2">
                            {practiceQueue[practiceIndex]?.ipa}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 font-medium">👆 Chạm để lật xem nghĩa & kiểm tra</p>
                    </div>

                    {/* MẶT SAU */}
                    <div className="absolute inset-0 w-full h-full bg-slate-800/95 border-2 border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Nghĩa Tiếng Việt
                      </span>

                      <div className="my-auto space-y-3">
                        <p className="text-2xl font-extrabold text-emerald-300">
                          {practiceQueue[practiceIndex]?.vietnamese_meaning}
                        </p>
                        {practiceQueue[practiceIndex]?.examples_json?.[0] && (
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-left">
                            <p className="text-xs text-slate-200">
                              "{practiceQueue[practiceIndex].examples_json[0].en}"
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              👉 {practiceQueue[practiceIndex].examples_json[0].vi}
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">Đánh giá khả năng nhớ bên dưới 👇</p>
                    </div>
                  </div>
                </div>

                {/* NÚT ĐÁNH GIÁ (NHỚ / QUÊN) */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => handleAnswer(false)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    ❌ Chưa Nhớ
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    ✅ Đã Nhớ
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* MODAL ĐĂNG NHẬP / ĐĂNG KÝ */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-4">
              {authMode === 'login' ? '🔑 Đăng Nhập' : '📝 Đăng Ký Tài Khoản'}
            </h3>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-xs text-slate-400 hover:text-emerald-400 underline"
              >
                {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
