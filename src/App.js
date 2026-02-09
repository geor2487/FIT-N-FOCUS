import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// 運動メニュー
const exerciseMenu = [
  { 
    id: 'squat-basic',
    category: 'スクワット',
    name: 'ノーマルスクワット',
    description: '足を肩幅に開き、膝がつま先より前に出ないように腰を落とします',
    defaultReps: 10,
    defaultSets: 2,
    tip: '💡 太もも・お尻を効率よく鍛える王道種目！',
    icon: 'squat-basic'
  },
  { 
    id: 'squat-sumo',
    category: 'スクワット',
    name: 'ワイドスクワット',
    description: '足を大きく開き、つま先を外側に向けて腰を落とします',
    defaultReps: 10,
    defaultSets: 2,
    tip: '💡 内ももを重点的に鍛えられる！',
    icon: 'squat-wide'
  },
  { 
    id: 'squat-pulse',
    category: 'スクワット',
    name: 'パルススクワット',
    description: '腰を落とした状態で小刻みに上下運動を繰り返します',
    defaultReps: 15,
    defaultSets: 2,
    tip: '💡 常に負荷がかかり続けて効果UP！',
    icon: 'squat-pulse'
  },
  { 
    id: 'pushup-desk',
    category: '腕立て',
    name: 'デスク腕立て伏せ',
    description: 'デスクに手をついて斜めの状態で腕立て伏せ',
    defaultReps: 10,
    defaultSets: 2,
    tip: '💡 初心者OK！デスクワークの合間に最適',
    icon: 'pushup-desk'
  },
  { 
    id: 'pushup-normal',
    category: '腕立て',
    name: 'ノーマル腕立て伏せ',
    description: '床に手をついて体をまっすぐに保ち上下運動',
    defaultReps: 10,
    defaultSets: 2,
    tip: '💡 胸・腕・体幹を同時に鍛える万能種目！',
    icon: 'pushup-normal'
  },
  { 
    id: 'situp',
    category: '腹筋',
    name: 'クランチ',
    description: '仰向けで膝を曲げ、肩甲骨が浮く程度に上体を起こします',
    defaultReps: 15,
    defaultSets: 2,
    tip: '💡 腰への負担が少なく、腹筋に集中できる！',
    icon: 'situp'
  },
  { 
    id: 'meditation',
    category: '瞑想',
    name: 'マインドフルネス瞑想',
    description: '楽な姿勢で座り、呼吸に意識を集中させます',
    defaultReps: 1,
    defaultSets: 1,
    tip: '💡 集中力回復＆ストレス軽減に効果的！',
    icon: 'meditation'
  },
];

const categories = ['スクワット', '腕立て', '腹筋', '瞑想'];

// 静止ピクトグラム
const ExerciseIcon = ({ type, size = 80 }) => {
  const icons = {
    'squat-basic': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="18" r="10" fill="#94A3B8"/>
        <line x1="50" y1="28" x2="50" y2="50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="35" x2="35" y2="45" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="35" x2="65" y2="45" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="40" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="60" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="40" y1="70" x2="38" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="60" y1="70" x2="62" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
    'squat-wide': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="20" r="10" fill="#94A3B8"/>
        <line x1="50" y1="30" x2="50" y2="50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="38" x2="30" y2="50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="38" x2="70" y2="50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="30" y2="65" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="70" y2="65" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="30" y1="65" x2="25" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="70" y1="65" x2="75" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
    'squat-pulse': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="25" r="10" fill="#94A3B8"/>
        <line x1="50" y1="35" x2="50" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="42" x2="30" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="42" x2="70" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="55" x2="35" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="55" x2="65" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="35" y1="70" x2="30" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="65" y1="70" x2="70" y2="85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M 80 45 L 85 50 L 80 55" stroke="#64748B" strokeWidth="2" fill="none"/>
        <path d="M 80 55 L 85 60 L 80 65" stroke="#64748B" strokeWidth="2" fill="none"/>
      </svg>
    ),
    'pushup-desk': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <rect x="10" y="40" width="35" height="5" rx="2" fill="#64748B"/>
        <rect x="10" y="45" width="5" height="25" fill="#64748B"/>
        <rect x="40" y="45" width="5" height="25" fill="#64748B"/>
        <circle cx="55" cy="35" r="8" fill="#94A3B8"/>
        <line x1="55" y1="43" x2="45" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="45" y1="55" x2="30" y2="45" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="45" y1="55" x2="70" y2="65" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="70" y1="65" x2="85" y2="75" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
    'pushup-normal': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="20" cy="40" r="8" fill="#94A3B8"/>
        <line x1="28" y1="42" x2="70" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="35" y1="47" x2="30" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="50" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="70" y1="55" x2="85" y2="60" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="85" y1="60" x2="90" y2="70" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="25" y1="72" x2="95" y2="72" stroke="#64748B" strokeWidth="2"/>
      </svg>
    ),
    'situp': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="35" cy="35" r="8" fill="#94A3B8"/>
        <line x1="40" y1="40" x2="55" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="38" y1="38" x2="30" y2="30" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="55" y1="55" x2="75" y2="50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="75" y1="50" x2="85" y2="60" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <line x1="20" y1="70" x2="90" y2="70" stroke="#64748B" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    'meditation': (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="25" r="10" fill="#94A3B8"/>
        <line x1="50" y1="35" x2="50" y2="55" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M 35 50 Q 50 58 65 50" stroke="#94A3B8" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M 30 70 Q 50 75 70 70" stroke="#94A3B8" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <ellipse cx="50" cy="72" rx="25" ry="8" fill="none" stroke="#64748B" strokeWidth="2"/>
      </svg>
    ),
  };

  return icons[type] || icons['squat-basic'];
};

function App() {
  // 認証状態
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  // フェーズ: 'ready' | 'work' | 'exercise-ready' | 'exercise' | 'interval' | 'rest'
  const [phase, setPhase] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState(exerciseMenu[0]);
  const [currentSet, setCurrentSet] = useState(1);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [totalCyclesAllTime, setTotalCyclesAllTime] = useState(0);
  
  // 設定
  const [workMinutes, setWorkMinutes] = useState(25);
  const [exerciseSeconds, setExerciseSeconds] = useState(30);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [restMinutes, setRestMinutes] = useState(5);
  const [reps, setReps] = useState(exerciseMenu[0].defaultReps);
  const [sets, setSets] = useState(exerciseMenu[0].defaultSets);
  
  const audioRef = useRef(null);

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ログイン
  const handleLogin = async () => {
    try {
      setLoginError('');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('ログインエラー:', error);
      setLoginError(`エラー: ${error.code} - ${error.message}`);
    }
  };

  // ログアウト
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setExerciseHistory([]);
      setTotalCyclesAllTime(0);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // 履歴を取得（ユーザーIDでフィルタ）
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setExerciseHistory([]);
      setTotalCyclesAllTime(0);
      return;
    }

    try {
      const q = query(
        collection(db, 'exerciseHistory'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      setExerciseHistory(history);

      // 総サイクル数を計算
      const totalCycles = history.reduce((sum, item) => sum + (item.cycles || 1), 0);
      setTotalCyclesAllTime(totalCycles);
    } catch (error) {
      console.error('履歴の取得に失敗:', error);
    }
  }, [user]);

  // 運動履歴を保存（ユーザーIDを含める）
  const saveExerciseHistory = useCallback(async (exercise, repsCompleted, setsCompleted) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'exerciseHistory'), {
        userId: user.uid,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        reps: repsCompleted,
        sets: setsCompleted,
        cycles: 1,
        timestamp: Timestamp.now(),
        date: new Date().toLocaleDateString('ja-JP'),
      });
      fetchHistory();
    } catch (error) {
      console.error('保存に失敗:', error);
    }
  }, [user, fetchHistory]);

  // ユーザーが変わったら履歴を再取得
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 通知の許可をリクエスト
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // 通知を送信
  const sendNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '⏱️',
        requireInteraction: true,
      });
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // 運動選択時にデフォルト値をセット
  const selectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setReps(exercise.defaultReps);
    setSets(exercise.defaultSets);
  };

  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      if (phase === 'work') {
        sendNotification('🏋️ 運動の時間です！', `${selectedExercise.name}を始めましょう`);
        setPhase('exercise-ready');
        setCurrentSet(1);
        setIsRunning(false);
      } else if (phase === 'exercise') {
        if (currentSet < sets) {
          sendNotification('⏸️ インターバル', `${intervalSeconds}秒休憩`);
          setPhase('interval');
          setTimeLeft(intervalSeconds);
        } else {
          // 全セット完了 → 履歴保存
          saveExerciseHistory(selectedExercise, reps, sets);
          sendNotification('✅ 運動完了！', `${restMinutes}分間休憩しましょう`);
          setPhase('rest');
          setTimeLeft(restMinutes * 60);
        }
      } else if (phase === 'interval') {
        sendNotification('💪 次のセット！', `セット ${currentSet + 1}/${sets} を始めましょう`);
        setCurrentSet(s => s + 1);
        setPhase('exercise-ready');
        setIsRunning(false);
      } else if (phase === 'rest') {
        sendNotification('🔔 休憩終了', '作業を再開しましょう');
        setCompletedCycles(c => c + 1);
        setPhase('work');
        setTimeLeft(workMinutes * 60);
      }
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, phase, currentSet, sets, workMinutes, exerciseSeconds, intervalSeconds, restMinutes, selectedExercise, sendNotification, saveExerciseHistory, reps]);

  const startTimer = () => {
    if (phase === 'ready') {
      setPhase('work');
      setTimeLeft(workMinutes * 60);
    }
    setIsRunning(true);
  };

  const startExercise = () => {
    setPhase('exercise');
    setTimeLeft(exerciseSeconds);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('ready');
    setTimeLeft(workMinutes * 60);
    setCurrentSet(1);
  };

  const skipPhase = () => {
    if (phase === 'exercise') {
      if (currentSet < sets) {
        setPhase('interval');
        setTimeLeft(intervalSeconds);
      } else {
        saveExerciseHistory(selectedExercise, reps, sets);
        setPhase('rest');
        setTimeLeft(restMinutes * 60);
      }
    } else if (phase === 'interval') {
      setCurrentSet(s => s + 1);
      setPhase('exercise-ready');
      setIsRunning(false);
    } else if (phase === 'rest') {
      setCompletedCycles(c => c + 1);
      setPhase('work');
      setTimeLeft(workMinutes * 60);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'work': return '#3B82F6';
      case 'exercise-ready': return '#F59E0B';
      case 'exercise': return '#10B981';
      case 'interval': return '#F59E0B';
      case 'rest': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'work': return '集中タイム';
      case 'exercise-ready': return '運動準備';
      case 'exercise': return 'エクササイズ';
      case 'interval': return 'インターバル';
      case 'rest': return '休憩';
      default: return 'スタンバイ';
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  };

  // 今日の運動をフィルタ
  const todayHistory = exerciseHistory.filter(
    item => item.date === new Date().toLocaleDateString('ja-JP')
  );

  // 認証ロード中
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログイン時のログイン画面
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginContainer}>
          <h1 style={styles.loginLogo}>FIT N' FOCUS</h1>
          <p style={styles.loginSubtitle}>集中と運動を習慣化するタイマーアプリ</p>
          <button onClick={handleLogin} style={styles.googleLoginButton}>
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '12px' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>
          <p style={styles.loginNote}>ログインすると運動履歴が保存されます</p>
          {loginError && (
            <p style={styles.loginError}>{loginError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YU..." type="audio/wav" />
      </audio>

      <header style={styles.header}>
        <h1 style={styles.logo}>
          FIT N' FOCUS
        </h1>
        <div style={styles.headerButtons}>
          <button onClick={() => setShowHistory(true)} style={styles.historyButton}>
            履歴
          </button>
          <button onClick={() => setShowMenu(true)} style={styles.menuButton}>
            トレーニングメニュー
          </button>
          <button onClick={() => setShowSettings(true)} style={styles.settingsButton}>
            ⚙️
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {notificationPermission === 'default' && (
          <div style={styles.notificationBanner}>
            <p style={styles.notificationText}>🔔 通知を許可すると、タイマー終了時にお知らせします</p>
            <button onClick={requestNotificationPermission} style={styles.notificationButton}>
              通知を許可
            </button>
          </div>
        )}

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{completedCycles}</span>
            <span style={styles.statLabel}>今日のサイクル</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{totalCyclesAllTime}</span>
            <span style={styles.statLabel}>累計サイクル</span>
          </div>
        </div>

        <div style={{...styles.timerContainer, borderColor: getPhaseColor()}}>
          <div style={{...styles.phaseLabel, color: getPhaseColor()}}>
            {getPhaseLabel()}
          </div>
          <div style={styles.timer}>
            {formatTime(timeLeft)}
          </div>
          
          {phase === 'exercise-ready' && (
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseIconContainer}>
                <ExerciseIcon type={selectedExercise.icon} size={100} />
              </div>
              <h2 style={styles.exerciseName}>{selectedExercise.name}</h2>
              <p style={styles.exerciseDescription}>{selectedExercise.description}</p>
              <div style={styles.exerciseStats}>
                <span style={styles.exerciseStat}>{reps}回</span>
                <span style={styles.exerciseStatDivider}>×</span>
                <span style={styles.exerciseStat}>{currentSet}/{sets}セット目</span>
              </div>
              <p style={styles.exerciseTip}>{selectedExercise.tip}</p>
              <button onClick={startExercise} style={styles.startExerciseButton}>
                ▶ 運動スタート
              </button>
            </div>
          )}

          {phase === 'exercise' && (
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseIconContainer}>
                <ExerciseIcon type={selectedExercise.icon} size={100} />
              </div>
              <h2 style={styles.exerciseName}>{selectedExercise.name}</h2>
              <div style={styles.exerciseStats}>
                <span style={styles.exerciseStat}>{reps}回</span>
                <span style={styles.exerciseStatDivider}>×</span>
                <span style={styles.exerciseStat}>{currentSet}/{sets}セット目</span>
              </div>
            </div>
          )}

          {phase === 'interval' && (
            <div style={styles.restInfo}>
              <p style={styles.restMessage}>セット間休憩</p>
              <p style={styles.restTip}>次のセット: {currentSet + 1}/{sets}</p>
            </div>
          )}

          {phase === 'rest' && (
            <div style={styles.restInfo}>
              <p style={styles.restMessage}>お疲れさまでした！</p>
              <p style={styles.restTip}>💧 水分補給をしましょう</p>
            </div>
          )}

          {phase === 'ready' && (
            <div style={styles.readyInfo}>
              <div style={styles.selectedExercisePreview}>
                <ExerciseIcon type={selectedExercise.icon} size={80} />
                <p style={styles.selectedExerciseName}>次の運動: {selectedExercise.name}</p>
                <p style={styles.selectedExerciseMeta}>
                  {reps}回 × {sets}セット / 各{exerciseSeconds}秒
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={styles.controls}>
          {phase === 'ready' && (
            <button onClick={startTimer} style={{...styles.primaryButton, backgroundColor: getPhaseColor()}}>
              ▶ スタート
            </button>
          )}
          
          {phase === 'work' && !isRunning && (
            <button onClick={() => setIsRunning(true)} style={{...styles.primaryButton, backgroundColor: getPhaseColor()}}>
              ▶ 再開
            </button>
          )}
          
          {phase === 'work' && isRunning && (
            <button onClick={pauseTimer} style={styles.pauseButton}>
              ⏸ 一時停止
            </button>
          )}

          {(phase === 'exercise' || phase === 'interval' || phase === 'rest') && isRunning && (
            <>
              <button onClick={pauseTimer} style={styles.pauseButton}>
                ⏸ 一時停止
              </button>
              <button onClick={skipPhase} style={styles.skipButton}>
                スキップ →
              </button>
            </>
          )}

          {(phase === 'exercise' || phase === 'interval' || phase === 'rest') && !isRunning && (
            <button onClick={() => setIsRunning(true)} style={{...styles.primaryButton, backgroundColor: getPhaseColor()}}>
              ▶ 再開
            </button>
          )}
          
          {phase !== 'ready' && (
            <button onClick={resetTimer} style={styles.resetButton}>
              リセット
            </button>
          )}
        </div>

        {/* 今日の運動サマリー */}
        {todayHistory.length > 0 && (
          <div style={styles.todaySummary}>
            <h3 style={styles.todaySummaryTitle}>📅 今日の運動</h3>
            {todayHistory.slice(0, 3).map((item, index) => (
              <div key={index} style={styles.todaySummaryItem}>
                <span>{item.exerciseName}</span>
                <span style={styles.todaySummaryMeta}>{item.reps}回 × {item.sets}セット</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 履歴モーダル */}
      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>運動履歴</h2>
              <button onClick={() => setShowHistory(false)} style={styles.closeButton}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.historyStats}>
                <div style={styles.historyStatItem}>
                  <span style={styles.historyStatValue}>{totalCyclesAllTime}</span>
                  <span style={styles.historyStatLabel}>累計サイクル</span>
                </div>
                <div style={styles.historyStatItem}>
                  <span style={styles.historyStatValue}>{exerciseHistory.length}</span>
                  <span style={styles.historyStatLabel}>運動回数</span>
                </div>
              </div>
              
              <h3 style={styles.historyListTitle}>最近の運動</h3>
              {exerciseHistory.length === 0 ? (
                <p style={styles.noHistory}>まだ運動履歴がありません</p>
              ) : (
                exerciseHistory.map((item, index) => (
                  <div key={index} style={styles.historyItem}>
                    <div style={styles.historyItemMain}>
                      <span style={styles.historyItemName}>{item.exerciseName}</span>
                      <span style={styles.historyItemDate}>{item.date}</span>
                    </div>
                    <div style={styles.historyItemDetail}>
                      {item.reps}回 × {item.sets}セット
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 運動メニューモーダル */}
      {showMenu && (
        <div style={styles.modalOverlay} onClick={() => setShowMenu(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>トレーニングメニュー</h2>
              <button onClick={() => setShowMenu(false)} style={styles.closeButton}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <p style={styles.menuInstruction}>運動を1つ選んでください</p>
              
              {categories.map(category => (
                <div key={category} style={styles.categorySection}>
                  <h3 style={styles.categoryTitle}>{category}</h3>
                  {exerciseMenu.filter(ex => ex.category === category).map(exercise => (
                    <div
                      key={exercise.id}
                      style={{
                        ...styles.exerciseItem,
                        ...(selectedExercise.id === exercise.id ? styles.exerciseItemSelected : {}),
                      }}
                      onClick={() => selectExercise(exercise)}
                    >
                      <div style={styles.exerciseItemIcon}>
                        <ExerciseIcon type={exercise.icon} size={50} />
                      </div>
                      <div style={styles.exerciseItemContent}>
                        <span style={styles.exerciseItemName}>{exercise.name}</span>
                        <span style={styles.exerciseItemDescription}>{exercise.description}</span>
                      </div>
                      {selectedExercise.id === exercise.id && (
                        <div style={styles.checkMark}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>設定</h2>
              <button onClick={() => setShowSettings(false)} style={styles.closeButton}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.settingSection}>
                <h3 style={styles.settingSectionTitle}>⏱️ 時間設定</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>作業時間（分）</label>
                  <input
                    type="number"
                    value={workMinutes}
                    onChange={e => setWorkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    style={styles.settingInput}
                    min="1"
                    max="60"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>運動時間（秒/セット）</label>
                  <input
                    type="number"
                    value={exerciseSeconds}
                    onChange={e => setExerciseSeconds(Math.max(10, parseInt(e.target.value) || 10))}
                    style={styles.settingInput}
                    min="10"
                    max="300"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>インターバル（秒）</label>
                  <input
                    type="number"
                    value={intervalSeconds}
                    onChange={e => setIntervalSeconds(Math.max(5, parseInt(e.target.value) || 5))}
                    style={styles.settingInput}
                    min="5"
                    max="60"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>休憩時間（分）</label>
                  <input
                    type="number"
                    value={restMinutes}
                    onChange={e => setRestMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    style={styles.settingInput}
                    min="1"
                    max="30"
                  />
                </div>
              </div>

              <div style={styles.settingSection}>
                <h3 style={styles.settingSectionTitle}>💪 運動設定</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>回数（{selectedExercise.name}）</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={e => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                    style={styles.settingInput}
                    min="1"
                    max="100"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>セット数</label>
                  <input
                    type="number"
                    value={sets}
                    onChange={e => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                    style={styles.settingInput}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#F1F5F9',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  loadingText: {
    fontSize: '18px',
    color: '#94A3B8',
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  loginLogo: {
    fontSize: '48px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#F1F5F9',
  },
  loginSubtitle: {
    fontSize: '16px',
    color: '#94A3B8',
    marginBottom: '48px',
  },
  googleLoginButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    color: '#333',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  loginNote: {
    fontSize: '14px',
    color: '#64748B',
    marginTop: '24px',
  },
  loginError: {
    fontSize: '14px',
    color: '#F87171',
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(248, 113, 113, 0.1)',
    borderRadius: '8px',
    maxWidth: '400px',
    wordBreak: 'break-all',
  },
  logoutButton: {
    background: 'rgba(248, 113, 113, 0.2)',
    border: '1px solid rgba(248, 113, 113, 0.5)',
    color: '#F87171',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  logo: {
    fontSize: '36px',
    fontWeight: '700',
    margin: 0,
    color: '#F1F5F9',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  historyButton: {
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.5)',
    color: '#A78BFA',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  menuButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#F1F5F9',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  settingsButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#F1F5F9',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  main: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  notificationBanner: {
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  notificationText: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#FCD34D',
  },
  notificationButton: {
    background: '#F59E0B',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    marginBottom: '32px',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#F1F5F9',
  },
  statLabel: {
    fontSize: '14px',
    color: '#94A3B8',
  },
  timerContainer: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '24px',
    padding: '40px',
    textAlign: 'center',
    border: '3px solid',
    marginBottom: '24px',
  },
  phaseLabel: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  timer: {
    fontSize: '72px',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: '4px',
  },
  exerciseInfo: {
    marginTop: '24px',
  },
  exerciseIconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  exerciseName: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#10B981',
  },
  exerciseDescription: {
    fontSize: '15px',
    color: '#94A3B8',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  exerciseStats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  exerciseStat: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#F1F5F9',
  },
  exerciseStatDivider: {
    fontSize: '20px',
    color: '#64748B',
  },
  exerciseTip: {
    fontSize: '14px',
    color: '#FCD34D',
    margin: '0 0 20px 0',
  },
  startExerciseButton: {
    background: '#10B981',
    color: '#fff',
    border: 'none',
    padding: '16px 48px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
  },
  restInfo: {
    marginTop: '24px',
  },
  restMessage: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#8B5CF6',
    margin: '0 0 8px 0',
  },
  restTip: {
    fontSize: '16px',
    color: '#94A3B8',
    margin: 0,
  },
  readyInfo: {
    marginTop: '24px',
  },
  selectedExercisePreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  selectedExerciseName: {
    fontSize: '16px',
    color: '#94A3B8',
    margin: 0,
  },
  selectedExerciseMeta: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  primaryButton: {
    color: '#fff',
    border: 'none',
    padding: '16px 48px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
  },
  pauseButton: {
    background: '#64748B',
    color: '#fff',
    border: 'none',
    padding: '16px 48px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
  },
  skipButton: {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid #94A3B8',
    padding: '16px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  resetButton: {
    background: 'transparent',
    color: '#F87171',
    border: '1px solid #F87171',
    padding: '16px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  todaySummary: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
  },
  todaySummaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#94A3B8',
    margin: '0 0 12px 0',
  },
  todaySummaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  todaySummaryMeta: {
    fontSize: '13px',
    color: '#64748B',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1E293B',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  },
  modalContent: {
    padding: '20px 24px',
    overflowY: 'auto',
  },
  historyStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
  },
  historyStatItem: {
    textAlign: 'center',
  },
  historyStatValue: {
    display: 'block',
    fontSize: '32px',
    fontWeight: '700',
    color: '#10B981',
  },
  historyStatLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  historyListTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: '12px',
  },
  noHistory: {
    textAlign: 'center',
    color: '#64748B',
    padding: '24px',
  },
  historyItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  historyItemMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  historyItemName: {
    fontWeight: '600',
    color: '#F1F5F9',
  },
  historyItemDate: {
    fontSize: '13px',
    color: '#64748B',
  },
  historyItemDetail: {
    fontSize: '14px',
    color: '#94A3B8',
  },
  menuInstruction: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '20px',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: '24px',
  },
  categoryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  exerciseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  exerciseItemSelected: {
    background: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  exerciseItemIcon: {
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exerciseItemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  exerciseItemName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
  },
  exerciseItemDescription: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  checkMark: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#10B981',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
  },
  settingSection: {
    marginBottom: '24px',
  },
  settingSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: '16px',
  },
  settingItem: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#94A3B8',
  },
  settingInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#F1F5F9',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
};

export default App;