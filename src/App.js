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
  work: '#3B82F6',
  'select-exercise': '#F59E0B',
  'exercise-ready': '#F59E0B',
  countdown: '#F59E0B',
  exercise: '#10B981',
  interval: '#F59E0B',
  rest: '#8B5CF6',
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
  const c = '#94A3B8';
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
  const [loginError, setLoginError] = useState('');

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
  const [showGuide, setShowGuide] = useState(false);
  const [historyTab, setHistoryTab] = useState('day');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [todayWorkSeconds, setTodayWorkSeconds] = useState(0);
  const [todayExercises, setTodayExercises] = useState([]);

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

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Formbricks初期化
  useEffect(() => {
    const envId = process.env.REACT_APP_FORMBRICKS_ENVIRONMENT_ID;
    if (envId) {
      formbricks.setup({
        environmentId: envId,
        appUrl: 'https://app.formbricks.com',
        userId: user?.uid,
      });
    }
  }, [user]);

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

      // 初回ユーザー判定（履歴が0件ならガイドを表示）
      if (allHistory.length === 0) {
        setShowGuide(true);
      }
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

  // readyフェーズ中にworkMinutesが変わったらタイマーも即更新
  useEffect(() => {
    if (phase === 'ready' && workMinutes > 0) {
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
    if (phase === 'countdown') {
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

  // 未ログイン時のログイン画面
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginContainer}>
          <h1 style={styles.loginLogo}>FIT N' FOCUS</h1>
          <p style={styles.loginSubtitle}>
            集中と運動を習慣化するタイマーアプリ
          </p>
          <button onClick={handleLogin} style={styles.googleLoginButton}>
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
          <p style={styles.loginNote}>ログインすると運動履歴が保存されます</p>
          {loginError && <p style={styles.loginError}>{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>FIT N' FOCUS</h1>
        <div style={styles.headerButtons}>
          <button
            onClick={() => setShowHistory(true)}
            style={styles.historyButton}
          >
            履歴
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={styles.settingsButton}
          >
            設定
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            ログアウト
          </button>
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

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>
              {formatWorkTime(totalTodayWorkSeconds)}
            </span>
            <span style={styles.statLabel}>今日の作業時間</span>
          </div>
        </div>

        <div style={{ ...styles.timerContainer, borderColor: phaseColor }}>
          <div style={{ ...styles.phaseLabel, color: phaseColor }}>
            {phaseLabel}
          </div>
          <div style={styles.timer}>
            {phase === 'countdown' ? timeLeft : formatTime(timeLeft)}
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
            </div>
          )}
        </div>

        <div style={styles.controls}>
          {phase === 'ready' && (
            <button
              onClick={startTimer}
              style={{
                ...styles.primaryButton,
                backgroundColor: phaseColor,
              }}
            >
              ▶ スタート
            </button>
          )}

          {phase === 'work' && !isRunning && (
            <button
              onClick={() => setIsRunning(true)}
              style={{
                ...styles.primaryButton,
                backgroundColor: phaseColor,
              }}
            >
              ▶ 再開
            </button>
          )}

          {phase === 'work' && isRunning && (
            <button onClick={pauseTimer} style={styles.pauseButton}>
              ⏸ 一時停止
            </button>
          )}

          {(phase === 'countdown' ||
            phase === 'exercise' ||
            phase === 'interval' ||
            phase === 'rest') &&
            isRunning && (
              <>
                <button onClick={pauseTimer} style={styles.pauseButton}>
                  ⏸ 一時停止
                </button>
                <button onClick={skipPhase} style={styles.skipButton}>
                  スキップ →
                </button>
              </>
            )}

          {(phase === 'countdown' ||
            phase === 'exercise' ||
            phase === 'interval' ||
            phase === 'rest') &&
            !isRunning && (
              <button
                onClick={() => setIsRunning(true)}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: phaseColor,
                }}
              >
                ▶ 再開
              </button>
            )}

          {phase !== 'ready' && (
            <button onClick={resetTimer} style={styles.resetButton}>
              リセット
            </button>
          )}
        </div>

        {/* 今日の種目別サマリー */}
        {todayExercises.length > 0 && (
          <div style={styles.todaySummary}>
            <h3 style={styles.todaySummaryTitle}>今日のトレーニング</h3>
            {summarizeExercises(todayExercises).map((summary, index) => (
              <div key={index} style={styles.todaySummaryItem}>
                <span>{summary.name}</span>
                <span style={styles.todaySummaryMeta}>
                  {summary.isMeditation
                    ? `${summary.totalMinutes}分`
                    : `${summary.totalReps}回`}
                </span>
              </div>
            ))}
          </div>
        )}
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

      {/* 初回ログインガイドモーダル */}
      {showGuide && (
        <div style={styles.modalOverlay} onClick={() => setShowGuide(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>FIT N' FOCUSへようこそ</h2>
              <button
                onClick={() => setShowGuide(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.guideSection}>
                <h3 style={styles.guideSectionTitle}>アプリの使い方</h3>
                <div style={styles.guideStep}>
                  <div style={styles.guideStepNumber}>1</div>
                  <div style={styles.guideStepContent}>
                    <p style={styles.guideStepTitle}>作業タイマーをスタート</p>
                    <p style={styles.guideStepDesc}>
                      スタートボタンを押して集中タイムを開始します（デフォルト25分）
                    </p>
                  </div>
                </div>
                <div style={styles.guideStep}>
                  <div style={styles.guideStepNumber}>2</div>
                  <div style={styles.guideStepContent}>
                    <p style={styles.guideStepTitle}>トレーニングを選択</p>
                    <p style={styles.guideStepDesc}>
                      作業タイマー終了後、表示されるメニューからトレーニングを選びます
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
              <button
                onClick={() => setShowGuide(false)}
                style={styles.guideCloseButton}
              >
                始める
              </button>
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  settingsButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#F1F5F9',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
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
    margin: 0,
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
  noHistory: {
    textAlign: 'center',
    color: '#64748B',
    padding: '24px',
  },
  historyTabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '4px',
  },
  historyTab: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#94A3B8',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  historyTabActive: {
    background: 'rgba(59, 130, 246, 0.3)',
    color: '#60A5FA',
  },
  historyGroup: {
    marginBottom: '12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  historyGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  historyGroupLabel: {
    fontWeight: '700',
    fontSize: '15px',
    color: '#F1F5F9',
  },
  historyGroupMeta: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  historyGroupBody: {
    padding: '8px 16px',
  },
  historyGroupItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  historyGroupItemName: {
    fontSize: '14px',
    color: '#CBD5E1',
  },
  historyGroupItemCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10B981',
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
  selectExerciseContainer: {
    marginTop: '24px',
  },
  selectExerciseTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: '16px',
    textAlign: 'center',
  },
  exerciseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  exerciseGridItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  exerciseGridItemSelected: {
    background: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  exerciseGridName: {
    fontSize: '11px',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  selectedExerciseDetail: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  selectedDetailName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#10B981',
    margin: '0 0 8px 0',
  },
  selectedDetailDescription: {
    fontSize: '13px',
    color: '#94A3B8',
    margin: 0,
    lineHeight: '1.4',
  },
  confirmExerciseButton: {
    width: '100%',
    background: '#10B981',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
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
    fontSize: '13px',
    color: '#94A3B8',
    marginBottom: '8px',
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
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#F1F5F9',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInputValueInput: {
    width: '60px',
    fontSize: '24px',
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    padding: '4px',
    MozAppearance: 'textfield',
    WebkitAppearance: 'none',
  },
  deleteHistoryButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    background: 'rgba(248, 113, 113, 0.1)',
    color: '#F87171',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteConfirm: {
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '12px',
    padding: '16px',
  },
  deleteConfirmText: {
    margin: '0 0 14px 0',
    fontSize: '14px',
    color: '#FCA5A5',
    lineHeight: '1.5',
  },
  deleteConfirmButtons: {
    display: 'flex',
    gap: '8px',
  },
  deleteConfirmYes: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#DC2626',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteConfirmNo: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#94A3B8',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  guideSection: {
    marginBottom: '24px',
  },
  guideSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
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
    background: '#3B82F6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    flexShrink: 0,
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#F1F5F9',
    margin: '0 0 4px 0',
  },
  guideStepDesc: {
    fontSize: '14px',
    color: '#94A3B8',
    margin: 0,
    lineHeight: '1.5',
  },
  guideCloseButton: {
    width: '100%',
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
};

export default App;
