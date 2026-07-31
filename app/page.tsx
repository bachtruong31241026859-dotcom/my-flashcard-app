'use client';
import React, { useState } from 'react';
import { Volume2, RotateCw, TreePine, Droplets, Shield, Sparkles, Edit3, Save, Search, Loader2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'flashcard' | 'tree' | 'admin'>('flashcard');
  const [role, setRole] = useState<'free' | 'vip'>('free');
  const [freeWordCount, setFreeWordCount] = useState(1);
  const [inputWord, setInputWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedBand, setSelectedBand] = useState<'4.0' | '6.0' | '8.0'>('6.0');
  const [waterDrops, setWaterDrops] = useState(145);
  const [isEditing, setIsEditing] = useState(false);

  // Dữ liệu từ vựng hiện tại (mặc định hoặc từ AI trả về)
  const [currentWord, setCurrentWord] = useState<any>({
    word: 'mitigate',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    part_of_speech: 'verb',
    vietnamese_meaning: 'Giảm nhẹ, làm bớt gay gắt (nguy cơ, thiệt hại)',
    examples_json: {
      examples: [
        { band: '4.0', sentence: 'We need to mitigate the damage after the storm.', translation: 'Chúng ta cần giảm nhẹ thiệt hại sau cơn bão.' },
        { band: '6.0', sentence: 'The government implemented strict policies to mitigate environmental pollution.', translation: 'Chính phủ đã thực thi các chính sách nghiêm ngặt để giảm thiểu ô nhiễm môi trường.' },
        { band: '8.0', sentence: 'Effective risk management strategies are imperative to mitigate adverse global economic volatility.', translation: 'Các chiến lược quản lý rủi ro hiệu quả là bắt buộc để giảm thiểu tác động bất lợi từ sự biến động kinh tế toàn cầu.' }
      ]
    }
  });

  const [customMeaning, setCustomMeaning] = useState(currentWord.vietnamese_meaning);
  const [cacheSource, setCacheSource] = useState<string | null>(null);

  // HÀM GỌI API TRA TỪ THẬT TỪ GEMINI / SUPABASE
  const handleSearch = async () => {
    if (!inputWord.trim()) return;
    setLoading(true);
    setErrorMessage('');
    setIsFlipped(false);

    try {
      const response = await fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: inputWord.trim(),
          user_id: '00000000-0000-0000-0000-000000000001' // ID người dùng demo
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Có lỗi xảy ra khi tra từ');
      }

      setCurrentWord(result.data);
      setCustomMeaning(result.data.vietnamese_meaning);
      setCacheSource(result.source === 'cache_hit' ? 'Global Cache Hit (Miễn phí API)' : 'AI Gemini vừa phân tích xong!');
      
      if (role === 'free' && result.source !== 'cache_hit') {
        setFreeWordCount((prev) => Math.min(prev + 1, 3));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ AI');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const getExampleByBand = (band: string) => {
    const list = currentWord.examples_json?.examples || [];
    return list.find((ex: any) => ex.band === band) || list[0] || { sentence: 'Chưa có ví dụ', translation: '' };
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* HEADER NAVBAR */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <TreePine className="w-8 h-8 text-emerald-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            IELTS Flashcard & Tree Growth
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
          <button onClick={() => setActiveTab('flashcard')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'flashcard' ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            📚 Học Flashcard
          </button>
          <button onClick={() => setActiveTab('tree')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'tree' ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            🌳 Trồng Cây Tri Thức
          </button>
          <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'admin' ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            ⚙️ Admin Panel
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${role === 'vip' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'bg-slate-700 text-slate-300'}`}>
            {role === 'vip' ? '👑 VIP Member' : '🌱 Free Plan'}
          </span>
          <button onClick={() => setRole(role === 'free' ? 'vip' : 'free')} className="text-xs text-slate-400 underline hover:text-slate-200">
            (Đổi quyền thử)
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {activeTab === 'flashcard' && (
          <div className="space-y-6">
            {/* Banner Thông báo Hạn Mức */}
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-300">
                  {role === 'free' ? (
                    <>Hôm nay bạn đã tạo: <strong className="text-emerald-400">{freeWordCount}/3 từ</strong> miễn phí</>
                  ) : (
                    <span className="text-amber-400 font-medium">✨ Tài khoản VIP - Tạo từ không giới hạn</span>
                  )}
                </span>
              </div>
              {cacheSource && (
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {cacheSource}
                </span>
              )}
            </div>

            {/* Ô nhập từ vựng */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập từ tiếng Anh (VD: accountant, meticulous)..."
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tra Từ AI'}
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-3 rounded-xl text-sm">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Thẻ Flashcard Lật Mặt */}
            <div className="perspective-1000 min-h-[360px] relative">
              <div className={`w-full min-h-[360px] bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col justify-between shadow-2xl transition-all duration-500`}>
                {!isFlipped ? (
                  // Mặt trước thẻ
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest">
                      {currentWord.part_of_speech || currentWord.partOfSpeech}
                    </span>
                    <h2 className="text-5xl font-extrabold text-white tracking-wide capitalize">{currentWord.word}</h2>
                    <p className="text-slate-400 text-lg">{currentWord.ipa}</p>
                    <button onClick={speakWord} className="p-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-all">
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  // Mặt sau thẻ
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs text-slate-400 mb-1">Nghĩa Tiếng Việt:</div>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input type="text" value={customMeaning} onChange={(e) => setCustomMeaning(e.target.value)} className="bg-slate-900 border border-emerald-500 rounded px-3 py-1 text-emerald-300 w-full" />
                            <button onClick={() => setIsEditing(false)} className="bg-emerald-500 text-slate-950 p-2 rounded">
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-emerald-400">{customMeaning}</h3>
                            <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-slate-300">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chọn Band Ví dụ */}
                    <div className="space-y-2">
                      <div className="flex gap-2 border-b border-slate-700 pb-2">
                        {(['4.0', '6.0', '8.0'] as const).map((band) => (
                          <button key={band} onClick={() => setSelectedBand(band)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${selectedBand === band ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                            IELTS Band {band}
                          </button>
                        ))}
                      </div>
                      <p className="text-lg text-slate-200 italic">"{getExampleByBand(selectedBand).sentence}"</p>
                      <p className="text-sm text-slate-400">👉 {getExampleByBand(selectedBand).translation}</p>
                    </div>
                  </div>
                )}

                {/* Nút lật thẻ */}
                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <button onClick={() => setIsFlipped(!isFlipped)} className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 text-sm transition-all">
                    <RotateCw className="w-4 h-4" /> Lật mặt thẻ
                  </button>
                </div>
              </div>
            </div>

            {/* Nút Đánh Giá Spaced Repetition (Anki) */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <button className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-3 rounded-xl">
                🔴 Khó (Ôn lại sau 1 ngày)
              </button>
              <button className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold py-3 rounded-xl">
                🟡 Vừa (Ôn lại sau 3 ngày)
              </button>
              <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold py-3 rounded-xl">
                🟢 Dễ (Ôn lại sau 7 ngày)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tree' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-emerald-400">Đồng Hồ Tích Giọt Nước</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Anti-cheat: Đang tính giờ
                  </span>
                </div>

                <div className="text-center py-6 bg-slate-900 rounded-xl border border-slate-700">
                  <div className="text-5xl font-black text-white mb-2">25:00</div>
                  <p className="text-slate-400 text-sm">1 phút active = 1 giọt nước</p>
                </div>

                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-8 h-8 text-cyan-400" />
                    <div>
                      <div className="text-sm text-slate-400">Kho nước tích lũy</div>
                      <div className="text-2xl font-bold text-white">{waterDrops} giọt</div>
                    </div>
                  </div>
                  <button onClick={() => setWaterDrops(waterDrops + 10)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm">
                    Tưới cây
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-emerald-400">Trạng Thái Cây Tri Thức</h3>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                      🌱 Cấp 3: Cây con (Sapling)
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Mầm non (30 giọt)</span>
                      <span>Cây con (180 giọt)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full w-[80%]" />
                    </div>
                  </div>

                  <div className="text-center py-8">
                    <TreePine className="w-32 h-32 text-emerald-400 mx-auto animate-bounce" />
                    <p className="mt-4 text-slate-300 font-medium">Cây của bạn đang phát triển rất khỏe mạnh!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-lg text-emerald-400">⚙️ Admin Panel - Quản Lý Membership Học Viên</h3>
            <p className="text-slate-400 text-sm">Giao diện quản lý kích hoạt VIP cho học viên qua chuyển khoản VietQR.</p>
          </div>
        )}
      </main>
    </div>
  );
}
