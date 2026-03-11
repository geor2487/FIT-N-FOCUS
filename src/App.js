import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth, googleProvider } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  Timestamp,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import formbricks from '@formbricks/js';

// 運動メニュー
const exerciseMenu = [
  {
    id: 'pushup',
    category: '腕立て',
    name: '腕立て伏せ',
    description: '床に手をついて体をまっすぐに保ち上下運動',
    defaultReps: 10,
    defaultSets: 2,
    tip: '胸・腕・体幹を同時に鍛える万能種目',
    icon: 'pushup',
  },
  {
    id: 'situp',
    category: '腹筋',
    name: '腹筋',
    description: '仰向けで膝を曲げ、肩甲骨が浮く程度に上体を起こします',
    defaultReps: 15,
    defaultSets: 2,
    tip: '腰への負担が少なく、腹筋に集中できる',
    icon: 'situp',
  },
  {
    id: 'squat',
    category: 'スクワット',
    name: 'スクワット',
    description: '足を肩幅に開き、膝がつま先より前に出ないように腰を落とします',
    defaultReps: 10,
    defaultSets: 2,
    tip: '太もも・お尻を効率よく鍛える王道種目',
    icon: 'squat',
  },
  {
    id: 'meditation',
    category: '瞑想',
    name: '瞑想',
    description: '楽な姿勢で座り、呼吸に意識を集中させます',
    defaultReps: 1,
    defaultSets: 1,
    defaultDuration: 300,
    isMeditation: true,
    tip: '集中力回復・ストレス軽減に効果的',
    icon: 'meditation',
  },
];

// Firestoreタイムスタンプ→Date変換
const toDate = (item) =>
  item.timestamp?.toDate
    ? item.timestamp.toDate()
    : new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : 0);

// フェーズ色・ラベル
const PHASE_COLORS = {
  work: '#5BA4B5',
  'select-exercise': '#C4956A',
  'exercise-ready': '#C4956A',
  countdown: '#C4956A',
  exercise: '#8ED1DE',
  interval: '#C4956A',
  rest: '#7A9E6D',
};

const PHASE_LABELS = {
  work: '集中タイム',
  'select-exercise': 'メニュー選択',
  'exercise-ready': '運動準備',
  countdown: '準備',
  exercise: 'エクササイズ',
  interval: 'インターバル',
  rest: '休憩',
};

// ピクトグラムアイコン
const ExerciseIcon = ({ type, size = 80 }) => {
  const c = '#7B8FA1';
  const icons = {
    pushup: (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* 腕立て伏せ：斜めプランク姿勢 */}
        <circle cx="78" cy="28" r="9" fill={c} />
        <line
          x1="72"
          y1="35"
          x2="22"
          y2="62"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="65"
          y1="40"
          x2="72"
          y2="65"
          stroke={c}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="22"
          y1="62"
          x2="14"
          y2="75"
          stroke={c}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="14"
          y1="75"
          x2="10"
          y2="82"
          stroke={c}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    ),
    situp: (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* 腹筋：上体を起こしたクランチ姿勢 */}
        <circle cx="38" cy="22" r="9" fill={c} />
        <line
          x1="42"
          y1="30"
          x2="52"
          y2="58"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="38"
          y1="34"
          x2="55"
          y2="30"
          stroke={c}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="52"
          y1="58"
          x2="72"
          y2="46"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="72"
          y1="46"
          x2="82"
          y2="62"
          stroke={c}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="82"
          y1="62"
          x2="80"
          y2="72"
          stroke={c}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    ),
    squat: (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* スクワット：腰を落として腕を前に伸ばす */}
        <circle cx="42" cy="16" r="9" fill={c} />
        <line
          x1="42"
          y1="25"
          x2="38"
          y2="48"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="42"
          y1="30"
          x2="70"
          y2="32"
          stroke={c}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="38"
          y1="48"
          x2="25"
          y2="62"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="25"
          y1="62"
          x2="35"
          y2="80"
          stroke={c}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="35"
          y1="80"
          x2="32"
          y2="88"
          stroke={c}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    ),
    meditation: (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* 瞑想：あぐら座り + 電波マーク */}
        <path
          d="M 42 8 Q 50 2 58 8"
          stroke={c}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 38 4 Q 50 -5 62 4"
          stroke={c}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="50" cy="22" r="9" fill={c} />
        <line
          x1="50"
          y1="31"
          x2="50"
          y2="56"
          stroke={c}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 50 40 Q 38 46 26 52 Q 22 54 28 62"
          stroke={c}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 50 40 Q 62 46 74 52 Q 78 54 72 62"
          stroke={c}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 28 62 Q 38 72 50 68 Q 62 72 72 62"
          stroke={c}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return icons[type] || icons['pushup'];
};

// +/−ボタン付き数値入力
const NumberInput = ({ label, value, onChange, min = 1 }) => (
  <div style={styles.exerciseInputGroup}>
    <label style={styles.exerciseInputLabel}>{label}</label>
    <div style={styles.exerciseInputControl}>
      <button
        style={styles.exerciseInputButton}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : parseInt(e.target.value))
        }
        onBlur={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
        style={styles.exerciseInputValueInput}
        min={min}
      />
      <button
        style={styles.exerciseInputButton}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  </div>
);

// 運動回数×セット表示
const ExerciseStatsDisplay = ({ reps, currentSet, sets }) => (
  <div style={styles.exerciseStats}>
    <span style={styles.exerciseStat}>{reps}回</span>
    <span style={styles.exerciseStatDivider}>×</span>
    <span style={styles.exerciseStat}>
      {currentSet}/{sets}セット目
    </span>
  </div>
);

function App() {
  // 認証状態
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [, setLoginError] = useState('');

  // フェーズ: 'ready' | 'work' | 'select-exercise' | 'exercise-ready' | 'countdown' | 'exercise' | 'interval' | 'rest'
  const [phase, setPhase] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(exerciseMenu[0]);
  const [currentSet, setCurrentSet] = useState(1);
  const [workSessionSeconds, setWorkSessionSeconds] = useState(0);
  const [notificationPermission, setNotificationPermission] =
    useState('default');
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [historyTab, setHistoryTab] = useState('day');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [todayWorkSeconds, setTodayWorkSeconds] = useState(0);
  const [, setTodayExercises] = useState([]);

  // 設定
  const [workMinutes, setWorkMinutes] = useState(25);
  const [exerciseSeconds, setExerciseSeconds] = useState(30);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [restMinutes, setRestMinutes] = useState(5);
  const [reps, setReps] = useState(() => {
    const saved = JSON.parse(
      localStorage.getItem(`exercise-settings-${exerciseMenu[0].id}`) || 'null'
    );
    return saved?.reps || exerciseMenu[0].defaultReps;
  });
  const [sets, setSets] = useState(() => {
    const saved = JSON.parse(
      localStorage.getItem(`exercise-settings-${exerciseMenu[0].id}`) || 'null'
    );
    return saved?.sets || exerciseMenu[0].defaultSets;
  });
  const [meditationMinutes, setMeditationMinutes] = useState(() => {
    const saved = JSON.parse(
      localStorage.getItem(`exercise-settings-meditation`) || 'null'
    );
    return saved?.meditationMinutes || 5;
  });

  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const sessionExerciseCountRef = useRef(0);

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 初回オンボーディング判定
  useEffect(() => {
    if (!localStorage.getItem('onboardingCompleted')) {
      setShowOnboarding(true);
      setOnboardingSlide(0);
    }
  }, []);

  // Formbricks初期化
  const formbricksInitRef = useRef(false);
  useEffect(() => {
    const envId = process.env.REACT_APP_FORMBRICKS_ENVIRONMENT_ID;
    console.log('[Formbricks] envId:', envId);
    if (envId && !formbricksInitRef.current) {
      formbricksInitRef.current = true;
      formbricks
        .setup({
          environmentId: envId,
          appUrl: 'https://app.formbricks.com',
        })
        .then(() => console.log('[Formbricks] setup OK'))
        .catch((e) => console.error('[Formbricks] setup error:', e));
    }
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
      setTodayWorkSeconds(0);
      setTodayExercises([]);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // 履歴を取得（ユーザーIDでフィルタ）
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setExerciseHistory([]);
      setTodayWorkSeconds(0);
      setTodayExercises([]);
      return;
    }

    try {
      // 全履歴を取得（複合インデックス不要のシンプルなクエリ）
      const allQuery = query(
        collection(db, 'exerciseHistory'),
        where('userId', '==', user.uid)
      );
      const allSnapshot = await getDocs(allQuery);
      const allHistory = [];
      allSnapshot.forEach((doc) => {
        allHistory.push({ id: doc.id, ...doc.data() });
      });

      // クライアント側でソート（timestamp降順）
      allHistory.sort((a, b) => toDate(b) - toDate(a));

      setExerciseHistory(allHistory);

      // 今日（午前0時〜）のデータを計算
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayItems = allHistory.filter(
        (item) => toDate(item) >= todayStart
      );
      setTodayWorkSeconds(
        todayItems.reduce((sum, item) => sum + (item.workSeconds || 0), 0)
      );
      setTodayExercises(todayItems);
    } catch (error) {
      console.error('履歴の取得に失敗:', error);
    }
  }, [user]);

  // 履歴を全消去
  const deleteAllHistory = useCallback(async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const allQuery = query(
        collection(db, 'exerciseHistory'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(allQuery);
      const deletePromises = [];
      snapshot.forEach((d) => {
        deletePromises.push(deleteDoc(doc(db, 'exerciseHistory', d.id)));
      });
      await Promise.all(deletePromises);
      setExerciseHistory([]);
      setTodayWorkSeconds(0);
      setTodayExercises([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('履歴の削除に失敗:', error);
    } finally {
      setDeleting(false);
    }
  }, [user]);

  // 運動履歴を保存（ユーザーIDを含める）
  const saveExerciseHistory = useCallback(
    async (exercise, repsCompleted, setsCompleted, workSecs) => {
      if (!user) return;

      try {
        await addDoc(collection(db, 'exerciseHistory'), {
          userId: user.uid,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          category: exercise.category,
          reps: repsCompleted,
          sets: setsCompleted,
          isMeditation: exercise.isMeditation || false,
          workSeconds: workSecs,
          timestamp: Timestamp.now(),
          date: new Date().toLocaleDateString('ja-JP'),
        });
        fetchHistory();
      } catch (error) {
        console.error('保存に失敗:', error);
      }
    },
    [user, fetchHistory]
  );

  // ユーザーが変わったら履歴を再取得
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 通知の許可をリクエスト
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // 通知音を鳴らす（Web Audio API使用）
  const playSound = useCallback(() => {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // 2回目の音（少し高い音）
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // 通知を送信
  const sendNotification = useCallback(
    (title, body) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '⏱️',
          requireInteraction: true,
        });
      }
      playSound();
    },
    [playSound]
  );

  // 画面が非表示になった時も時間を正確に計算するためのタイマー
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      lastTickRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTickRef.current) / 1000);

        if (elapsed >= 1) {
          lastTickRef.current = now;
          setTimeLeft((time) => Math.max(0, time - elapsed));
          // 作業フェーズ中は作業時間をカウント
          if (phase === 'work') {
            setWorkSessionSeconds((s) => s + elapsed);
          }
        }
      }, 100); // 100msごとにチェック（より正確に）

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, phase]);

  // 運動完了処理（瞑想完了/セット間/全セット完了の3分岐）
  const completeExercise = useCallback(
    (notify = false) => {
      if (selectedExercise.isMeditation) {
        saveExerciseHistory(
          selectedExercise,
          meditationMinutes,
          1,
          workSessionSeconds
        );
        if (notify)
          sendNotification('瞑想完了', `${restMinutes}分間休憩しましょう`);
        sessionExerciseCountRef.current += 1;
        console.log(
          '[Formbricks] exercise count:',
          sessionExerciseCountRef.current
        );
        if (sessionExerciseCountRef.current === 3) {
          console.log('[Formbricks] firing track: exercise_completed_3rd');
          formbricks
            .track('exercise_completed_3rd')
            .then((r) => console.log('[Formbricks] track result:', r))
            .catch((e) => console.error('[Formbricks] track error:', e));
        }
        setPhase('rest');
        setTimeLeft(restMinutes * 60);
        setWorkSessionSeconds(0);
      } else if (currentSet < sets) {
        if (notify)
          sendNotification('インターバル', `${intervalSeconds}秒休憩`);
        setPhase('interval');
        setTimeLeft(intervalSeconds);
      } else {
        saveExerciseHistory(selectedExercise, reps, sets, workSessionSeconds);
        if (notify)
          sendNotification('運動完了', `${restMinutes}分間休憩しましょう`);
        sessionExerciseCountRef.current += 1;
        console.log(
          '[Formbricks] exercise count:',
          sessionExerciseCountRef.current
        );
        if (sessionExerciseCountRef.current === 3) {
          console.log('[Formbricks] firing track: exercise_completed_3rd');
          formbricks
            .track('exercise_completed_3rd')
            .then((r) => console.log('[Formbricks] track result:', r))
            .catch((e) => console.error('[Formbricks] track error:', e));
        }
        setPhase('rest');
        setTimeLeft(restMinutes * 60);
        setWorkSessionSeconds(0);
      }
    },
    [
      selectedExercise,
      meditationMinutes,
      workSessionSeconds,
      restMinutes,
      currentSet,
      sets,
      intervalSeconds,
      reps,
      saveExerciseHistory,
      sendNotification,
    ]
  );

  // タイマー終了時の処理
  useEffect(() => {
    if (isRunning && timeLeft === 0) {
      if (phase === 'work') {
        sendNotification(
          '運動の時間です',
          'トレーニングメニューを選択してください'
        );
        setPhase('select-exercise');
        setIsRunning(false);
      } else if (phase === 'exercise') {
        completeExercise(true);
      } else if (phase === 'countdown') {
        // カウントダウン完了 → 運動開始
        setPhase('exercise');
        setTimeLeft(exerciseSeconds);
      } else if (phase === 'interval') {
        sendNotification(
          '次のセット',
          `セット ${currentSet + 1}/${sets} を始めましょう`
        );
        setCurrentSet((s) => s + 1);
        setPhase('countdown');
        setTimeLeft(3);
      } else if (phase === 'rest') {
        sendNotification('休憩終了', '作業を再開しましょう');
        setPhase('work');
        setTimeLeft(workMinutes * 60);
      }
    }
  }, [
    isRunning,
    timeLeft,
    phase,
    currentSet,
    sets,
    workMinutes,
    exerciseSeconds,
    sendNotification,
    completeExercise,
  ]);

  // 作業時間設定が変わったらタイマーに即反映（ready・work中）
  useEffect(() => {
    if ((phase === 'ready' || phase === 'work') && workMinutes > 0) {
      setTimeLeft(workMinutes * 60);
    }
  }, [workMinutes, phase]);

  const startTimer = () => {
    if (phase === 'ready') {
      setPhase('work');
      setTimeLeft(workMinutes * 60);
      setWorkSessionSeconds(0);
    }
    setIsRunning(true);
  };

  const confirmExerciseSelection = () => {
    if (selectedExercise.isMeditation) {
      localStorage.setItem(
        `exercise-settings-meditation`,
        JSON.stringify({ meditationMinutes })
      );
    } else {
      localStorage.setItem(
        `exercise-settings-${selectedExercise.id}`,
        JSON.stringify({ reps, sets })
      );
    }
    setPhase('exercise-ready');
    setCurrentSet(1);
  };

  const startExercise = () => {
    if (selectedExercise.isMeditation) {
      // 瞑想はカウントダウンなしで直接開始
      setPhase('exercise');
      setTimeLeft(meditationMinutes * 60);
    } else {
      setPhase('countdown');
      setTimeLeft(3);
    }
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
    if (phase === 'select-exercise' || phase === 'exercise-ready') {
      setPhase('rest');
      setTimeLeft(restMinutes * 60);
      setIsRunning(true);
    } else if (phase === 'countdown') {
      setPhase('exercise');
      setTimeLeft(exerciseSeconds);
    } else if (phase === 'exercise') {
      completeExercise();
    } else if (phase === 'interval') {
      setCurrentSet((s) => s + 1);
      setPhase('countdown');
      setTimeLeft(3);
    } else if (phase === 'rest') {
      setPhase('work');
      setTimeLeft(workMinutes * 60);
      setWorkSessionSeconds(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const phaseColor = PHASE_COLORS[phase] || '#6B7280';
  const phaseLabel = PHASE_LABELS[phase] || 'スタンバイ';

  // iOS判定
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('通知許可エラー:', error);
      setNotificationPermission('unsupported');
    }
  };

  // 今日の作業時間（Firestoreから取得済み + 現在のセッション）
  const totalTodayWorkSeconds = todayWorkSeconds + workSessionSeconds;

  // 時間フォーマット（秒・分・時間）
  const formatWorkTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    if (mins > 0) {
      return `${mins}分${secs > 0 ? `${secs}秒` : ''}`;
    }
    return `${secs}秒`;
  };

  // 履歴を期間でグループ化
  const getHistoryGroups = () => {
    const groupBy = (keyFn, labelFn) => {
      const groups = {};
      exerciseHistory.forEach((item) => {
        const date = toDate(item);
        const key = keyFn(date);
        if (!groups[key]) {
          groups[key] = {
            label: labelFn(date),
            items: [],
            workSeconds: 0,
            sortKey: key,
          };
        }
        groups[key].items.push(item);
        groups[key].workSeconds += item.workSeconds || 0;
      });
      return Object.values(groups).sort((a, b) =>
        b.sortKey.localeCompare(a.sortKey)
      );
    };

    const pad = (n) => String(n).padStart(2, '0');

    switch (historyTab) {
      case 'day':
        return groupBy(
          (d) =>
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          (d) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
        );
      case 'week': {
        return groupBy(
          (d) => {
            const jan1 = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil(
              ((d - jan1) / 86400000 + jan1.getDay() + 1) / 7
            );
            return `${d.getFullYear()}-W${pad(week)}`;
          },
          (d) => {
            const day = d.getDay();
            const mon = new Date(d);
            mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            const sun = new Date(mon);
            sun.setDate(mon.getDate() + 6);
            return `${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}`;
          }
        );
      }
      case 'month':
        return groupBy(
          (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
          (d) => `${d.getFullYear()}年${d.getMonth() + 1}月`
        );
      case 'year':
        return groupBy(
          (d) => `${d.getFullYear()}`,
          (d) => `${d.getFullYear()}年`
        );
      default:
        return [];
    }
  };

  // グループ内の種目集計
  const summarizeExercises = (items) => {
    const summary = {};
    items.forEach((item) => {
      const key = item.exerciseId || item.exerciseName;
      if (!summary[key]) {
        summary[key] = {
          name: item.exerciseName,
          isMeditation: item.isMeditation || false,
          totalReps: 0,
          totalMinutes: 0,
        };
      }
      if (item.isMeditation) {
        summary[key].totalMinutes += item.reps || 0;
      } else {
        summary[key].totalReps += (item.reps || 0) * (item.sets || 1);
      }
    });
    return Object.values(summary);
  };

  // 現在の期間の集計（タブに連動）
  const getCurrentPeriodStats = () => {
    const now = new Date();
    let start;

    switch (historyTab) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const day = now.getDay();
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (day === 0 ? 6 : day - 1)
        );
        break;
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(0);
    }

    const filtered = exerciseHistory.filter((item) => toDate(item) >= start);
    return {
      workSeconds: filtered.reduce(
        (sum, item) => sum + (item.workSeconds || 0),
        0
      ),
      count: filtered.length,
    };
  };

  const periodLabels = {
    day: '今日',
    week: '今週',
    month: '今月',
    year: '今年',
  };

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

  // SVG circle timer calculations
  const timerRadius = 148;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const getTimerTotal = () => {
    switch (phase) {
      case 'work': return workMinutes * 60;
      case 'exercise': return selectedExercise.isMeditation ? meditationMinutes * 60 : exerciseSeconds;
      case 'countdown': return 3;
      case 'interval': return intervalSeconds;
      case 'rest': return restMinutes * 60;
      default: return workMinutes * 60;
    }
  };
  const timerProgress = phase === 'ready' ? 0 : (1 - timeLeft / getTimerTotal());
  const timerDashoffset = timerCircumference * (1 - timerProgress);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>FIT <span style={styles.logoAccent}>N'</span> FOCUS</h1>
        <div style={styles.headerRight}>
          {user && (
            <button
              onClick={() => setShowHistory(true)}
              style={styles.headerBtnHistory}
            >
              履歴
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            style={styles.headerBtn}
          >
            設定
          </button>
          {user ? (
            <button onClick={handleLogout} style={styles.headerBtnLogout}>
              ログアウト
            </button>
          ) : (
            <button onClick={handleLogin} style={styles.headerBtn}>
              ログイン
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {notificationPermission === 'default' && !isIOS && (
          <div style={styles.notificationBanner}>
            <p style={styles.notificationText}>
              通知を許可すると、タイマー終了時にお知らせします
            </p>
            <button
              onClick={requestNotificationPermission}
              style={styles.notificationButton}
            >
              通知を許可
            </button>
          </div>
        )}
        {isIOS && notificationPermission !== 'granted' && (
          <div style={styles.notificationBanner}>
            <p style={styles.notificationText}>iOSでは通知音でお知らせします</p>
          </div>
        )}

        <div style={styles.timerSection}>
          <div style={styles.timerWrapper}>
            <div style={styles.breathingRing} />
            <svg style={styles.timerSvg} viewBox="0 0 320 320">
              <circle cx="160" cy="160" r={timerRadius} style={styles.timerGlowRing} />
              <circle cx="160" cy="160" r={timerRadius} style={styles.timerTrack} />
              <circle
                cx="160" cy="160" r={timerRadius}
                style={{
                  ...styles.timerProgressRing,
                  stroke: phaseColor,
                  strokeDasharray: timerCircumference,
                  strokeDashoffset: timerDashoffset,
                  filter: `drop-shadow(0 0 8px ${phaseColor}66)`,
                }}
              />
            </svg>
            <div style={styles.timerCenter}>
              <div style={{ ...styles.timerMode, color: phaseColor }}>
                {phaseLabel}
              </div>
              <div style={styles.timerDisplay}>
                {phase === 'countdown' ? timeLeft : formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {phase === 'countdown' && (
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseIconContainer}>
                <ExerciseIcon type={selectedExercise.icon} size={100} />
              </div>
              <h2 style={styles.exerciseName}>{selectedExercise.name}</h2>
              <ExerciseStatsDisplay
                reps={reps}
                currentSet={currentSet}
                sets={sets}
              />
            </div>
          )}

          {phase === 'exercise-ready' && (
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseIconContainer}>
                <ExerciseIcon type={selectedExercise.icon} size={100} />
              </div>
              <h2 style={styles.exerciseName}>{selectedExercise.name}</h2>
              <p style={styles.exerciseDescription}>
                {selectedExercise.description}
              </p>
              {selectedExercise.isMeditation ? (
                <div style={styles.exerciseStats}>
                  <span style={styles.exerciseStat}>
                    {meditationMinutes}分間
                  </span>
                </div>
              ) : (
                <ExerciseStatsDisplay
                  reps={reps}
                  currentSet={currentSet}
                  sets={sets}
                />
              )}
              <p style={styles.exerciseTip}>{selectedExercise.tip}</p>
              <button
                onClick={startExercise}
                style={styles.startExerciseButton}
              >
                ▶{' '}
                {selectedExercise.isMeditation
                  ? '瞑想スタート'
                  : '運動スタート'}
              </button>
              <button
                onClick={skipPhase}
                style={styles.skipExerciseButton}
              >
                スキップ →
              </button>
            </div>
          )}

          {phase === 'exercise' && (
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseIconContainer}>
                <ExerciseIcon type={selectedExercise.icon} size={100} />
              </div>
              <h2 style={styles.exerciseName}>{selectedExercise.name}</h2>
              {selectedExercise.isMeditation ? (
                <div style={styles.exerciseStats}>
                  <span style={styles.exerciseStat}>
                    {meditationMinutes}分間の瞑想中
                  </span>
                </div>
              ) : (
                <ExerciseStatsDisplay
                  reps={reps}
                  currentSet={currentSet}
                  sets={sets}
                />
              )}
            </div>
          )}

          {phase === 'interval' && (
            <div style={styles.restInfo}>
              <p style={styles.restMessage}>セット間休憩</p>
              <p style={styles.restTip}>
                次のセット: {currentSet + 1}/{sets}
              </p>
            </div>
          )}

          {phase === 'rest' && (
            <div style={styles.restInfo}>
              <p style={styles.restMessage}>お疲れさまでした</p>
              <p style={styles.restTip}>水分補給をしましょう</p>
            </div>
          )}

          {phase === 'select-exercise' && (
            <div style={styles.selectExerciseContainer}>
              <p style={styles.selectExerciseTitle}>トレーニングを選択</p>
              <div style={styles.exerciseGrid}>
                {exerciseMenu.map((exercise) => (
                  <div
                    key={exercise.id}
                    style={{
                      ...styles.exerciseGridItem,
                      ...(selectedExercise.id === exercise.id
                        ? styles.exerciseGridItemSelected
                        : {}),
                    }}
                    onClick={() => {
                      setSelectedExercise(exercise);
                      if (exercise.isMeditation) {
                        const saved = JSON.parse(
                          localStorage.getItem(
                            `exercise-settings-meditation`
                          ) || 'null'
                        );
                        setMeditationMinutes(
                          saved?.meditationMinutes ||
                            Math.floor(exercise.defaultDuration / 60)
                        );
                      } else {
                        const saved = JSON.parse(
                          localStorage.getItem(
                            `exercise-settings-${exercise.id}`
                          ) || 'null'
                        );
                        setReps(saved?.reps || exercise.defaultReps);
                        setSets(saved?.sets || exercise.defaultSets);
                      }
                    }}
                  >
                    <ExerciseIcon type={exercise.icon} size={40} />
                    <span style={styles.exerciseGridName}>{exercise.name}</span>
                  </div>
                ))}
              </div>
              <div style={styles.selectedExerciseDetail}>
                <p style={styles.selectedDetailName}>{selectedExercise.name}</p>
                <p style={styles.selectedDetailDescription}>
                  {selectedExercise.description}
                </p>
              </div>
              {selectedExercise.isMeditation ? (
                <div style={styles.exerciseInputs}>
                  <NumberInput
                    label="時間（分）"
                    value={meditationMinutes}
                    onChange={setMeditationMinutes}
                  />
                </div>
              ) : (
                <div style={styles.exerciseInputs}>
                  <NumberInput label="回数" value={reps} onChange={setReps} />
                  <NumberInput label="セット" value={sets} onChange={setSets} />
                </div>
              )}
              <button
                onClick={confirmExerciseSelection}
                style={styles.confirmExerciseButton}
              >
                この運動で開始
              </button>
              <button
                onClick={skipPhase}
                style={styles.skipExerciseButton}
              >
                トレーニングをスキップ →
              </button>
            </div>
          )}

          <div style={styles.controls}>
            {phase === 'ready' && (
              <button
                onClick={startTimer}
                style={styles.ctrlBtnPrimary}
              >
                ▶ スタート
              </button>
            )}

            {phase === 'work' && !isRunning && (
              <button
                onClick={() => setIsRunning(true)}
                style={styles.ctrlBtnPrimary}
              >
                ▶ 再開
              </button>
            )}

            {phase === 'work' && isRunning && (
              <button onClick={pauseTimer} style={styles.ctrlBtnPrimary}>
                ⏸ 一時停止
              </button>
            )}

            {(phase === 'countdown' ||
              phase === 'exercise' ||
              phase === 'interval' ||
              phase === 'rest') &&
              isRunning && (
                <button onClick={pauseTimer} style={styles.ctrlBtnPrimary}>
                  ⏸ 一時停止
                </button>
              )}

            {(phase === 'countdown' ||
              phase === 'exercise' ||
              phase === 'interval' ||
              phase === 'rest') &&
              !isRunning && (
                <button
                  onClick={() => setIsRunning(true)}
                  style={styles.ctrlBtnPrimary}
                >
                  ▶ 再開
                </button>
              )}
          </div>

          <div style={styles.todayStats}>
            <span style={styles.todayStatsValue}>{formatWorkTime(totalTodayWorkSeconds)}</span>
            <span style={styles.todayStatsLabel}>今日の作業時間</span>
          </div>
        </div>
      </main>

      {/* 履歴モーダル */}
      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>運動履歴</h2>
              <button
                onClick={() => setShowHistory(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.historyTabs}>
                {[
                  { key: 'day', label: '日' },
                  { key: 'week', label: '週' },
                  { key: 'month', label: '月' },
                  { key: 'year', label: '年' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setHistoryTab(tab.key)}
                    style={{
                      ...styles.historyTab,
                      ...(historyTab === tab.key
                        ? styles.historyTabActive
                        : {}),
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={styles.historyStats}>
                <div style={styles.historyStatItem}>
                  <span style={styles.historyStatValue}>
                    {formatWorkTime(getCurrentPeriodStats().workSeconds)}
                  </span>
                  <span style={styles.historyStatLabel}>
                    {periodLabels[historyTab]}の作業時間
                  </span>
                </div>
                <div style={styles.historyStatItem}>
                  <span style={styles.historyStatValue}>
                    {getCurrentPeriodStats().count}回
                  </span>
                  <span style={styles.historyStatLabel}>
                    {periodLabels[historyTab]}のトレーニング
                  </span>
                </div>
              </div>

              {exerciseHistory.length === 0 ? (
                <p style={styles.noHistory}>まだ運動履歴がありません</p>
              ) : (
                getHistoryGroups().map((group) => (
                  <div key={group.sortKey} style={styles.historyGroup}>
                    <div style={styles.historyGroupHeader}>
                      <span style={styles.historyGroupLabel}>
                        {group.label}
                      </span>
                      <span style={styles.historyGroupMeta}>
                        {group.items.length}回 |{' '}
                        {formatWorkTime(group.workSeconds)}
                      </span>
                    </div>
                    <div style={styles.historyGroupBody}>
                      {summarizeExercises(group.items).map((ex, i) => (
                        <div key={i} style={styles.historyGroupItem}>
                          <span style={styles.historyGroupItemName}>
                            {ex.name}
                          </span>
                          <span style={styles.historyGroupItemCount}>
                            {ex.isMeditation
                              ? `${ex.totalMinutes}分`
                              : `${ex.totalReps}回`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setShowSettings(false);
            }}
          >
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>設定</h2>
              <button
                onClick={() => setShowSettings(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.settingSection}>
                <h3 style={styles.settingSectionTitle}>作業設定</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>作業時間（分）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={workMinutes}
                    onChange={(e) =>
                      setWorkMinutes(
                        e.target.value === '' ? '' : parseInt(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      setWorkMinutes(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    style={styles.settingInput}
                    min="1"
                    max="60"
                  />
                </div>
              </div>

              <div style={styles.settingSection}>
                <h3 style={styles.settingSectionTitle}>運動設定</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>
                    運動時間（秒/セット）
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={exerciseSeconds}
                    onChange={(e) =>
                      setExerciseSeconds(
                        e.target.value === '' ? '' : parseInt(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      setExerciseSeconds(
                        Math.max(10, parseInt(e.target.value) || 10)
                      )
                    }
                    style={styles.settingInput}
                    min="10"
                    max="300"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>インターバル（秒）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={intervalSeconds}
                    onChange={(e) =>
                      setIntervalSeconds(
                        e.target.value === '' ? '' : parseInt(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      setIntervalSeconds(
                        Math.max(5, parseInt(e.target.value) || 5)
                      )
                    }
                    style={styles.settingInput}
                    min="5"
                    max="60"
                  />
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>休憩時間（分）</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={restMinutes}
                    onChange={(e) =>
                      setRestMinutes(
                        e.target.value === ''
                          ? ''
                          : parseInt(e.target.value) || ''
                      )
                    }
                    onBlur={(e) =>
                      setRestMinutes(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    style={styles.settingInput}
                    min="1"
                    max="30"
                  />
                </div>
              </div>

              <div style={styles.settingSection}>
                <h3 style={styles.settingSectionTitle}>データ</h3>
                {showDeleteConfirm ? (
                  <div style={styles.deleteConfirm}>
                    <p style={styles.deleteConfirmText}>
                      全ての運動履歴が削除されます。この操作は取り消せません。
                    </p>
                    <div style={styles.deleteConfirmButtons}>
                      <button
                        onClick={deleteAllHistory}
                        disabled={deleting}
                        style={styles.deleteConfirmYes}
                      >
                        {deleting ? '削除中...' : '削除する'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        style={styles.deleteConfirmNo}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={styles.deleteHistoryButton}
                  >
                    履歴を消去
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* スライド形式オンボーディング */}
      {showOnboarding && (
        <div style={styles.onboardingOverlay}>
          <div style={styles.onboardingContainer}>
            {onboardingSlide === 0 && (
              <div style={styles.onboardingSlide}>
                <h1 style={styles.onboardingTitle}>FIT N' FOCUSへようこそ</h1>
                <p style={styles.onboardingDesc}>
                  集中と運動を組み合わせたポモドーロ式タイマーアプリ
                </p>
                <div style={styles.onboardingCycle}>
                  <div style={styles.onboardingCycleItem}>
                    <div
                      style={{
                        ...styles.onboardingCycleIcon,
                        background: 'rgba(91, 164, 181, 0.15)',
                        borderColor: '#5BA4B5',
                      }}
                    >
                      <span
                        style={{
                          ...styles.onboardingCycleEmoji,
                          color: '#8ED1DE',
                        }}
                      >
                        WORK
                      </span>
                    </div>
                    <span style={styles.onboardingCycleLabel}>作業</span>
                  </div>
                  <span style={styles.onboardingCycleArrow}>→</span>
                  <div style={styles.onboardingCycleItem}>
                    <div
                      style={{
                        ...styles.onboardingCycleIcon,
                        background: 'rgba(142, 209, 222, 0.15)',
                        borderColor: '#8ED1DE',
                      }}
                    >
                      <span
                        style={{
                          ...styles.onboardingCycleEmoji,
                          color: '#8ED1DE',
                        }}
                      >
                        FIT
                      </span>
                    </div>
                    <span style={styles.onboardingCycleLabel}>運動</span>
                  </div>
                  <span style={styles.onboardingCycleArrow}>→</span>
                  <div style={styles.onboardingCycleItem}>
                    <div
                      style={{
                        ...styles.onboardingCycleIcon,
                        background: 'rgba(122, 158, 109, 0.2)',
                        borderColor: '#7A9E6D',
                      }}
                    >
                      <span
                        style={{
                          ...styles.onboardingCycleEmoji,
                          color: '#7A9E6D',
                        }}
                      >
                        REST
                      </span>
                    </div>
                    <span style={styles.onboardingCycleLabel}>休憩</span>
                  </div>
                </div>
              </div>
            )}

            {onboardingSlide === 1 && (
              <div style={styles.onboardingSlide}>
                <h2 style={styles.onboardingTitle}>使い方</h2>
                <div style={styles.guideSection}>
                  <div style={styles.guideStep}>
                    <div style={styles.guideStepNumber}>1</div>
                    <div style={styles.guideStepContent}>
                      <p style={styles.guideStepTitle}>
                        作業タイマーをスタート
                      </p>
                      <p style={styles.guideStepDesc}>
                        スタートボタンを押して集中タイムを開始（デフォルト25分）
                      </p>
                    </div>
                  </div>
                  <div style={styles.guideStep}>
                    <div style={styles.guideStepNumber}>2</div>
                    <div style={styles.guideStepContent}>
                      <p style={styles.guideStepTitle}>トレーニングを選択</p>
                      <p style={styles.guideStepDesc}>
                        タイマー終了後、メニューからトレーニングを選びます
                      </p>
                    </div>
                  </div>
                  <div style={styles.guideStep}>
                    <div style={styles.guideStepNumber}>3</div>
                    <div style={styles.guideStepContent}>
                      <p style={styles.guideStepTitle}>運動して休憩</p>
                      <p style={styles.guideStepDesc}>
                        運動後は休憩タイムで回復。その後また作業に戻ります
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {onboardingSlide === 2 && (
              <div style={styles.onboardingSlide}>
                <h2 style={styles.onboardingTitle}>
                  ログインするともっと便利に
                </h2>
                <div style={styles.onboardingMerits}>
                  <div style={styles.onboardingMeritItem}>
                    <span style={styles.onboardingMeritIcon}>●</span>
                    <span>運動履歴が保存される</span>
                  </div>
                  <div style={styles.onboardingMeritItem}>
                    <span style={styles.onboardingMeritIcon}>●</span>
                    <span>日・週・月・年の統計が見られる</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await signInWithPopup(auth, googleProvider);
                      localStorage.setItem('onboardingCompleted', 'true');
                      setShowOnboarding(false);
                    } catch (error) {
                      console.error('ログインエラー:', error);
                    }
                  }}
                  style={styles.googleLoginButton}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    style={{ marginRight: '12px' }}
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Googleでログイン
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('onboardingCompleted', 'true');
                    setShowOnboarding(false);
                  }}
                  style={styles.onboardingSkipLogin}
                >
                  ログインせずに始める
                </button>
              </div>
            )}

            {/* ドットインジケーター */}
            <div style={styles.onboardingDots}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    ...styles.onboardingDot,
                    background:
                      i === onboardingSlide
                        ? '#8ED1DE'
                        : 'rgba(91, 164, 181, 0.3)',
                  }}
                />
              ))}
            </div>

            {/* ナビゲーションボタン */}
            <div style={styles.onboardingNav}>
              {onboardingSlide > 0 && (
                <button
                  onClick={() => setOnboardingSlide((s) => s - 1)}
                  style={styles.onboardingPrevButton}
                >
                  前へ
                </button>
              )}
              {onboardingSlide < 2 && (
                <button
                  onClick={() => setOnboardingSlide((s) => s + 1)}
                  style={{
                    ...styles.onboardingNextButton,
                    ...(onboardingSlide === 0 ? { marginLeft: 'auto' } : {}),
                  }}
                >
                  次へ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  // ── Base ──
  container: {
    minHeight: '100vh',
    background: '#1B2838',
    fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
    color: '#F2F6FA',
    fontWeight: 500,
    WebkitFontSmoothing: 'antialiased',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  loadingText: {
    fontSize: '16px',
    color: '#B0C2D3',
    fontWeight: 500,
    letterSpacing: '0.05em',
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
    fontSize: '36px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#F2F6FA',
    letterSpacing: '1.5px',
    textShadow: '0 0 12px rgba(91, 164, 181, 0.2)',
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#B0C2D3',
    marginBottom: '48px',
    fontWeight: 500,
  },
  googleLoginButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    color: '#333',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  loginNote: {
    fontSize: '14px',
    color: '#B0C2D3',
    marginTop: '24px',
    fontWeight: 500,
  },
  loginError: {
    fontSize: '14px',
    color: '#F87171',
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(248, 113, 113, 0.1)',
    borderRadius: '10px',
    maxWidth: '400px',
    wordBreak: 'break-all',
  },

  // ── Header ──
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(91, 164, 181, 0.15)',
    background: 'rgba(27, 40, 56, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    color: '#F2F6FA',
    letterSpacing: '1.5px',
    textShadow: '0 0 12px rgba(91, 164, 181, 0.2)',
  },
  logoAccent: {
    color: '#8ED1DE',
    textShadow: '0 0 16px rgba(142, 209, 222, 0.3)',
  },
  todayStats: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px 24px',
    marginTop: '24px',
    background: 'rgba(91, 164, 181, 0.08)',
    borderRadius: '10px',
    border: '1px solid rgba(91, 164, 181, 0.12)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(91, 164, 181, 0.03)',
  },
  todayStatsValue: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#8ED1DE',
    textShadow: '0 0 14px rgba(142, 209, 222, 0.3)',
  },
  todayStatsLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#B0C2D3',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerBtn: {
    background: 'transparent',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    color: '#B0C2D3',
    padding: '8px 20px',
    borderRadius: '22px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.25s ease',
  },
  headerBtnHistory: {
    background: 'rgba(91, 164, 181, 0.1)',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    color: '#8ED1DE',
    padding: '8px 20px',
    borderRadius: '22px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.25s ease',
  },
  headerBtnLogout: {
    background: 'transparent',
    border: '1px solid rgba(229, 115, 115, 0.25)',
    color: '#E57373',
    padding: '8px 20px',
    borderRadius: '22px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.25s ease',
  },

  // ── Main ──
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  notificationBanner: {
    background: 'rgba(196, 149, 106, 0.1)',
    border: '1px solid rgba(196, 149, 106, 0.2)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '24px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  notificationText: {
    margin: 0,
    fontSize: '14px',
    color: '#C4956A',
    fontWeight: 500,
  },
  notificationButton: {
    background: 'rgba(196, 149, 106, 0.2)',
    color: '#C4956A',
    border: '1px solid rgba(196, 149, 106, 0.3)',
    padding: '8px 20px',
    borderRadius: '22px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '8px',
    fontFamily: 'inherit',
  },

  // ── Timer Section ──
  timerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '36px',
    padding: '24px 0',
    width: '100%',
  },
  timerWrapper: {
    position: 'relative',
    width: '320px',
    height: '320px',
  },
  breathingRing: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    right: '-8px',
    bottom: '-8px',
    borderRadius: '50%',
    border: '1px solid rgba(142, 209, 222, 0.06)',
    animation: 'oceanBreathe 4s ease-in-out infinite',
  },
  timerSvg: {
    width: '100%',
    height: '100%',
    transform: 'rotate(-90deg)',
    filter: 'drop-shadow(0 0 10px rgba(91, 164, 181, 0.15))',
    animation: 'glowPulse 3s ease-in-out infinite',
  },
  timerTrack: {
    fill: 'none',
    stroke: 'rgba(91, 164, 181, 0.1)',
    strokeWidth: 4,
  },
  timerGlowRing: {
    fill: 'none',
    stroke: 'rgba(91, 164, 181, 0.06)',
    strokeWidth: 12,
  },
  timerProgressRing: {
    fill: 'none',
    strokeWidth: 4,
    strokeLinecap: 'round',
    transition: 'stroke-dashoffset 1s linear',
  },
  timerCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  timerMode: {
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: '0 0 16px rgba(142, 209, 222, 0.3)',
  },
  timerDisplay: {
    fontSize: '5rem',
    fontWeight: 700,
    color: '#F2F6FA',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    textShadow: '0 0 20px rgba(91, 164, 181, 0.3)',
  },

  // ── Controls ──
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '28px',
  },
  ctrlBtnPrimary: {
    background: 'linear-gradient(135deg, #5BA4B5, #4A8FA0)',
    border: 'none',
    color: '#F2F6FA',
    padding: '14px 36px',
    borderRadius: '30px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.25s ease',
    fontFamily: 'inherit',
    fontSize: '16px',
    fontWeight: 600,
    boxShadow: '0 4px 16px rgba(91, 164, 181, 0.25)',
  },

  // ── Exercise Info (inside timer area) ──
  exerciseInfo: {
    marginTop: '24px',
    textAlign: 'center',
  },
  exerciseIconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  exerciseName: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: '#8ED1DE',
    letterSpacing: '0.04em',
  },
  exerciseDescription: {
    fontSize: '14px',
    color: '#B0C2D3',
    margin: '0 0 16px 0',
    lineHeight: '1.6',
    fontWeight: 500,
  },
  exerciseStats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  exerciseStat: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F2F6FA',
  },
  exerciseStatDivider: {
    fontSize: '18px',
    color: '#B0C2D3',
  },
  exerciseTip: {
    fontSize: '14px',
    color: '#C4956A',
    margin: '0 0 20px 0',
    fontWeight: 500,
  },
  startExerciseButton: {
    background: 'linear-gradient(135deg, #5BA4B5, #4A8FA0)',
    color: '#F2F6FA',
    border: 'none',
    padding: '14px 36px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(91, 164, 181, 0.25)',
  },
  restInfo: {
    marginTop: '24px',
    textAlign: 'center',
  },
  restMessage: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#7A9E6D',
    margin: '0 0 8px 0',
  },
  restTip: {
    fontSize: '14px',
    color: '#B0C2D3',
    margin: 0,
    fontWeight: 500,
  },

  // ── Select Exercise ──
  selectExerciseContainer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  selectExerciseTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#C4956A',
    marginBottom: '16px',
    textAlign: 'center',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    textShadow: '0 0 16px rgba(196, 149, 106, 0.3)',
  },
  exerciseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  exerciseGridItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 10px',
    background: 'rgba(37, 59, 79, 0.5)',
    borderRadius: '14px',
    cursor: 'pointer',
    border: '1px solid rgba(91, 164, 181, 0.1)',
    transition: 'all 0.25s ease',
  },
  exerciseGridItemSelected: {
    background: 'rgba(91, 164, 181, 0.15)',
    borderColor: '#5BA4B5',
    boxShadow: '0 0 12px rgba(91, 164, 181, 0.15)',
  },
  exerciseGridName: {
    fontSize: '14px',
    color: '#B0C2D3',
    textAlign: 'center',
    lineHeight: '1.2',
    fontWeight: 500,
  },
  selectedExerciseDetail: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  selectedDetailName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#8ED1DE',
    margin: '0 0 8px 0',
  },
  selectedDetailDescription: {
    fontSize: '14px',
    color: '#B0C2D3',
    margin: 0,
    lineHeight: '1.5',
    fontWeight: 500,
  },
  confirmExerciseButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #5BA4B5, #4A8FA0)',
    color: '#F2F6FA',
    border: 'none',
    padding: '14px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(91, 164, 181, 0.25)',
  },
  skipExerciseButton: {
    width: '100%',
    background: 'transparent',
    color: '#B0C2D3',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    padding: '10px',
    borderRadius: '22px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '10px',
    fontFamily: 'inherit',
  },
  exerciseInputs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '20px',
  },
  exerciseInputGroup: {
    textAlign: 'center',
  },
  exerciseInputLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#B0C2D3',
    marginBottom: '8px',
    fontWeight: 500,
  },
  exerciseInputControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  exerciseInputButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    background: 'rgba(91, 164, 181, 0.1)',
    color: '#F2F6FA',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontWeight: 600,
  },
  exerciseInputValueInput: {
    width: '60px',
    fontSize: '22px',
    fontWeight: 700,
    color: '#F2F6FA',
    textAlign: 'center',
    background: 'rgba(91, 164, 181, 0.08)',
    border: '1px solid rgba(91, 164, 181, 0.2)',
    borderRadius: '10px',
    padding: '4px',
    MozAppearance: 'textfield',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
  },

  // ── Modals ──
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
    background: 'rgba(37, 59, 79, 0.95)',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(91, 164, 181, 0.15)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(91, 164, 181, 0.15)',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#F2F6FA',
    letterSpacing: '0.05em',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#B0C2D3',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
  },
  modalContent: {
    padding: '20px 24px',
    overflowY: 'auto',
  },

  // ── History ──
  historyStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(91, 164, 181, 0.08)',
    borderRadius: '14px',
    border: '1px solid rgba(91, 164, 181, 0.12)',
  },
  historyStatItem: {
    textAlign: 'center',
  },
  historyStatValue: {
    display: 'block',
    fontSize: '26px',
    fontWeight: 700,
    color: '#8ED1DE',
    lineHeight: 1.2,
    textShadow: '0 0 14px rgba(142, 209, 222, 0.3)',
  },
  historyStatLabel: {
    fontSize: '14px',
    color: '#B0C2D3',
    fontWeight: 500,
    marginTop: '4px',
  },
  noHistory: {
    textAlign: 'center',
    color: '#B0C2D3',
    padding: '24px',
    fontSize: '14px',
    fontWeight: 500,
  },
  historyTabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: 'rgba(91, 164, 181, 0.05)',
    borderRadius: '22px',
    padding: '4px',
    border: '1px solid rgba(91, 164, 181, 0.1)',
  },
  historyTab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: '18px',
    background: 'transparent',
    color: '#B0C2D3',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  historyTabActive: {
    background: 'rgba(91, 164, 181, 0.15)',
    color: '#8ED1DE',
    fontWeight: 600,
  },
  historyGroup: {
    marginBottom: '12px',
    background: 'rgba(91, 164, 181, 0.05)',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(91, 164, 181, 0.1)',
  },
  historyGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(91, 164, 181, 0.1)',
  },
  historyGroupLabel: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#F2F6FA',
  },
  historyGroupMeta: {
    fontSize: '14px',
    color: '#B0C2D3',
    fontWeight: 500,
  },
  historyGroupBody: {
    padding: '8px 16px',
  },
  historyGroupItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(91, 164, 181, 0.05)',
  },
  historyGroupItemName: {
    fontSize: '14px',
    color: '#B0C2D3',
    fontWeight: 500,
  },
  historyGroupItemCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8ED1DE',
  },

  // ── Settings ──
  settingSection: {
    marginBottom: '24px',
  },
  settingSectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#B0C2D3',
    marginBottom: '16px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(91, 164, 181, 0.15)',
  },
  settingItem: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#B0C2D3',
  },
  settingInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(91, 164, 181, 0.2)',
    background: 'rgba(91, 164, 181, 0.08)',
    color: '#F2F6FA',
    fontSize: '16px',
    fontWeight: 600,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  deleteHistoryButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '22px',
    border: '1px solid rgba(229, 115, 115, 0.25)',
    background: 'rgba(229, 115, 115, 0.08)',
    color: '#E57373',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteConfirm: {
    background: 'rgba(229, 115, 115, 0.08)',
    border: '1px solid rgba(229, 115, 115, 0.2)',
    borderRadius: '14px',
    padding: '16px',
  },
  deleteConfirmText: {
    margin: '0 0 14px 0',
    fontSize: '14px',
    color: '#FCA5A5',
    lineHeight: '1.6',
    fontWeight: 500,
  },
  deleteConfirmButtons: {
    display: 'flex',
    gap: '8px',
  },
  deleteConfirmYes: {
    flex: 1,
    padding: '10px',
    borderRadius: '22px',
    border: 'none',
    background: '#DC2626',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteConfirmNo: {
    flex: 1,
    padding: '10px',
    borderRadius: '22px',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    background: 'transparent',
    color: '#B0C2D3',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // ── Onboarding ──
  onboardingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(21, 31, 43, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  onboardingContainer: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  onboardingSlide: {
    width: '100%',
    textAlign: 'center',
  },
  onboardingTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#F2F6FA',
    marginBottom: '16px',
    letterSpacing: '0.04em',
  },
  onboardingDesc: {
    fontSize: '16px',
    color: '#B0C2D3',
    marginBottom: '40px',
    lineHeight: '1.7',
    fontWeight: 500,
  },
  onboardingCycle: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  onboardingCycleItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  onboardingCycleIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingCycleEmoji: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
  },
  onboardingCycleLabel: {
    fontSize: '14px',
    color: '#F2F6FA',
    fontWeight: 500,
  },
  onboardingCycleArrow: {
    fontSize: '20px',
    color: '#B0C2D3',
    marginBottom: '28px',
  },
  onboardingMerits: {
    textAlign: 'left',
    margin: '0 auto 32px',
    maxWidth: '300px',
  },
  onboardingMeritItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    fontSize: '16px',
    color: '#F2F6FA',
    fontWeight: 500,
  },
  onboardingMeritIcon: {
    color: '#5BA4B5',
    fontSize: '8px',
  },
  onboardingSkipLogin: {
    background: 'transparent',
    border: 'none',
    color: '#B0C2D3',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '16px',
    padding: '12px 24px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    fontWeight: 500,
  },
  onboardingDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '32px',
    marginBottom: '24px',
  },
  onboardingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  onboardingNav: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '300px',
  },
  onboardingPrevButton: {
    background: 'transparent',
    border: '1px solid rgba(91, 164, 181, 0.25)',
    color: '#B0C2D3',
    padding: '10px 28px',
    borderRadius: '22px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  onboardingNextButton: {
    background: 'linear-gradient(135deg, #5BA4B5, #4A8FA0)',
    border: 'none',
    color: '#F2F6FA',
    padding: '10px 28px',
    borderRadius: '22px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(91, 164, 181, 0.25)',
  },

  // ── Guide (onboarding step 2) ──
  guideSection: {
    marginBottom: '24px',
  },
  guideSectionTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F2F6FA',
    marginBottom: '20px',
    textAlign: 'center',
  },
  guideStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  guideStepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(91, 164, 181, 0.15)',
    border: '1px solid #5BA4B5',
    color: '#8ED1DE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F2F6FA',
    margin: '0 0 4px 0',
  },
  guideStepDesc: {
    fontSize: '14px',
    color: '#B0C2D3',
    margin: 0,
    lineHeight: '1.6',
    fontWeight: 500,
  },
  guideCloseButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #5BA4B5, #4A8FA0)',
    color: '#F2F6FA',
    border: 'none',
    padding: '14px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(91, 164, 181, 0.25)',
  },
};

export default App;
