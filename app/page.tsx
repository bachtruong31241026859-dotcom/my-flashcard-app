'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [word, setWord] = useState('');
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

  // Kiểm tra trạng thái đăng nhập khi load trang
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

  // Tải danh sách từ vựng đã lưu khi chuyển sang Tab "Bộ Thẻ"
  useEffect(() => {
    if (activeTab === 'saved') {
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

  // Tra từ AI (Đã nâng cấp bắt lỗi chi tiết 404 / 500)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    setResult(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });

      // Nếu Server trả về lỗi (như 404 hoặc 500)
      if (!res.ok) {
        const errText = await res.text();
        console.error('Lỗi Server:', errText);
        alert(`Lỗi Server (${res.status}): Vui lòng kiểm tra lại file API hoặc GROQ_API_KEY!`);
        return;
      }

      const data = await res.json();
      if (data.data) {
        setResult(data.data);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi tra từ!');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      alert(`Lỗi kết nối: ${err.message || 'Không thể kết nối tới server AI'}`);
    } finally {
      setLoading(false);
    }
  };

  // Lưu từ vào Supabase
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: result.word,
          ipa: result.ipa,
          part_of_speech: result.partOfSpeech || result.part_of_speech,
          vietnamese_meaning: result.vietnamese_meaning,
          examples_json: result.examples,
          user_id: user ? user.id : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
      } else {
        alert('Lỗi khi lưu: ' + data.error);
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ lưu trữ');
    } finally {
      setSaving(false);
    }
  };

  // Xóa từ vựng khỏi Supabase
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

  // Phát âm từ vựng
  const speakWord = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Xử lý Auth (Đăng nhập / Đăng ký)
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🌲</div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            IELTS Flashcard AI
          </h1>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'search'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔍 Tra Từ AI
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'saved'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎴 Bộ Thẻ Đã Lưu ({savedCards.length})
          </button>
        </div>

        {/* User Auth Section */}
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
              🔑 Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        {/* TAB 1: TRA TỪ AI */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Nhập từ vựng tiếng Anh (Ví dụ: Mitigate, Resilience...)"
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
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ví dụ ngữ cảnh IELTS</h3>
                    {result.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                        <p className="text-slate-200 italic font-serif">"{ex.en}"</p>
                        <p className="text-slate-400 text-sm mt-1">👉 {ex.vi}</p>
                        {ex.band && (
                          <span className="inline-block text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded mt-2">
                            IELTS Band {ex.band}
                          </span>
                        )}
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">🎴 Thẻ từ vựng của bạn</h2>
              <button
                onClick={fetchSavedCards}
                className="text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                🔄 Làm mới
              </button>
            </div>

            {loadingCards ? (
              <div className="text-center py-12 text-slate-500">Đang tải bộ thẻ từ vựng...</div>
            ) : savedCards.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-base">Bạn chưa lưu từ vựng nào.</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-3 text-sm text-emerald-400 hover:underline"
                >
                  Tra từ ngay để lưu bộ thẻ đầu tiên!
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedCards.map((card) => {
                  const isFlipped = flippedCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                      className={`cursor-pointer bg-slate-800 border rounded-2xl p-5 transition-all duration-300 relative flex flex-col justify-between min-h-[200px] ${
                        isFlipped
                          ? 'border-emerald-500/50 bg-slate-800/90 shadow-lg'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {/* Top Action Buttons */}
                      <div className="flex justify-between items-center w-full z-10">
                        <span className="text-[11px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                          {card.part_of_speech || 'Vocabulary'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => speakWord(card.word, e)}
                            className="text-xs bg-slate-700/60 hover:bg-slate-600 p-1.5 rounded-full text-emerald-400"
                            title="Phát âm"
                          >
                            🔊
                          </button>
                          <button
                            onClick={(e) => handleDeleteCard(card.id, e)}
                            className="text-xs text-slate-500 hover:text-red-400 p-1.5"
                            title="Xóa thẻ"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Card Body (Mặt trước vs Mặt sau) */}
                      {!isFlipped ? (
                        <div className="my-auto text-center py-4">
                          <h3 className="text-3xl font-extrabold text-white tracking-wide">{card.word}</h3>
                          {card.ipa && <p className="text-slate-400 font-mono text-sm mt-1">{card.ipa}</p>}
                          <p className="text-xs text-slate-500 mt-3 font-medium">👆 Chạm để lật xem nghĩa</p>
                        </div>
                      ) : (
                        <div className="my-auto py-2 space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Nghĩa tiếng Việt</span>
                            <p className="text-lg font-bold text-emerald-300">{card.vietnamese_meaning}</p>
                          </div>
                          {card.examples_json && card.examples_json.length > 0 && (
                            <div className="pt-2 border-t border-slate-700/50">
                              <p className="text-xs italic text-slate-300">"{card.examples_json[0].en}"</p>
                              <p className="text-xs text-slate-400 mt-0.5">👉 {card.examples_json[0].vi}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] text-right text-slate-500">
                        {isFlipped ? 'Lật lại' : 'Mặt trước'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AUTH MODAL (Đăng nhập / Đăng ký) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-white text-center mb-4">
              {authMode === 'login' ? 'Đăng Nhập' : 'Đăng ký tài khoản'}
            </h2>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50"
              >
                {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
              </button>
            </form>

            <div className="mt-4 text-center">
              {authMode === 'login' ? (
                <p className="text-xs text-slate-400">
                  Chưa có tài khoản?{' '}
                  <button onClick={() => setAuthMode('signup')} className="text-emerald-400 hover:underline">
                    Đăng ký ngay
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Đã có tài khoản?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-emerald-400 hover:underline">
                    Đăng nhập
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
