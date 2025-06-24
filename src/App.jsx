import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import './App.css';
import StatisticsDashboard from './StatisticsDashboard';

// --- 유틸리티 함수 ---
const shuffleArray = (array) => array.slice().sort(() => Math.random() - 0.5);
const isYesterday = (d1, d2) => {
    const y = new Date(d2);
    y.setDate(y.getDate() - 1);
    return d1.toDateString() === y.toDateString();
};
const isToday = (d1, d2) => d1.toDateString() === d2.toDateString();

// --- 상수 ---
const srsIntervals = [1, 3, 7, 14, 30, 90, 180, 365];

function App() {
    // --- 상태 관리 (State) ---
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('start');
    const [allQuestions, setAllQuestions] = useState([]);
    const [error, setError] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [timerSetting, setTimerSetting] = useState(30);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');

    const [currentQuestionSet, setCurrentQuestionSet] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [shuffledOptions, setShuffledOptions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState({ text: '', isCorrect: false });
    const [timer, setTimer] = useState(timerSetting);
    
    const [quizProgress, setQuizProgress] = useState({});
    const [learningStreak, setLearningStreak] = useState(0);
    
    // --- 데이터 로딩 및 저장 ---
    const GOOGLE_SHEETS_API_URL = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        const savedTimerSetting = localStorage.getItem('timerSetting');
        if (savedTimerSetting) setTimerSetting(Number(savedTimerSetting));

        const fetchQuizData = async () => {
            setIsLoading(true);
            setError(null);
            if (!GOOGLE_SHEETS_API_URL) {
                setError("퀴즈 데이터를 불러올 수 없습니다. 관리자에게 문의하세요.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(GOOGLE_SHEETS_API_URL);
                if (!response.ok) throw new Error(`HTTP 오류! 상태: ${response.status}`);
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                
                const validQuestions = result.data.filter(q => q.ID != null && q.ID !== '' && q.Category);
                setAllQuestions(validQuestions);

                const savedProgress = JSON.parse(localStorage.getItem('quizProgress') || '{}');
                setQuizProgress(savedProgress);

                const lastQuizDateStr = localStorage.getItem('lastQuizDate');
                const savedStreak = parseInt(localStorage.getItem('streak') || '0', 10);
                if (lastQuizDateStr) {
                    const lastDate = new Date(lastQuizDateStr);
                    const today = new Date();
                    if (isToday(lastDate, today)) setLearningStreak(savedStreak);
                    else if (isYesterday(lastDate, today)) setLearningStreak(savedStreak + 1);
                    else setLearningStreak(0);
                } else {
                    setLearningStreak(0);
                }
            } catch (e) {
                console.error("퀴즈 데이터 로딩 실패:", e);
                setError("퀴즈 데이터를 불러오는 데 실패했습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuizData();
    }, [GOOGLE_SHEETS_API_URL]);

    const saveDataToStorage = useCallback((progress, streak) => {
        localStorage.setItem('quizProgress', JSON.stringify(progress));
        localStorage.setItem('lastQuizDate', new Date().toISOString().split('T')[0]);
        localStorage.setItem('streak', streak.toString());
    }, []);

    const uniqueCategories = useMemo(() => {
        if (!allQuestions || allQuestions.length === 0) return ['All'];
        const categories = new Set(allQuestions.map(q => q.Category));
        return ['All', ...categories];
    }, [allQuestions]);

    const uniqueDifficulties = useMemo(() => {
        if (!allQuestions || allQuestions.length === 0) return ['All'];
        const difficulties = new Set(allQuestions.map(q => q.Difficulty).filter(Boolean));
        return ['All', ...difficulties];
    }, [allQuestions]);

    useEffect(() => {
        if (view === 'finished' && currentQuestionSet.length > 0) {
            const accuracy = score / currentQuestionSet.length;
            if (accuracy >= 0.8) {
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.7 } });
            }
        }
    }, [view, score, currentQuestionSet]);

    const currentQuestion = useMemo(() => currentQuestionSet[currentQuestionIndex] || null, [currentQuestionSet, currentQuestionIndex]);

    useEffect(() => {
        if (currentQuestion?.Type === 'MultipleChoice') {
            const options = [currentQuestion.Option1, currentQuestion.Option2, currentQuestion.Option3, currentQuestion.Option4].filter(Boolean);
            setShuffledOptions(shuffleArray(options));
        }
    }, [currentQuestion]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || isSettingsOpen) return;
            if (view === 'quiz' && currentQuestion) {
                if (!isAnswered) {
                    if (['1', '2', '3', '4'].includes(e.key) && currentQuestion.Type === 'MultipleChoice') {
                        const optionIndex = parseInt(e.key) - 1;
                        if (shuffledOptions[optionIndex]) handleOptionChange(currentQuestion.ID, shuffledOptions[optionIndex]);
                    }
                }
                if (e.key === 'Enter') {
                    if (!isAnswered && userAnswers[currentQuestion.ID]) handleAnswerSubmission(false);
                    else if (isAnswered) goToNextQuestion();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, isAnswered, currentQuestion, shuffledOptions, userAnswers, isSettingsOpen]);

    useEffect(() => {
        if (view !== 'quiz' || isAnswered || timerSetting === 0) return;
        const interval = setInterval(() => setTimer(prev => prev > 0 ? prev - 1 : 0), 1000);
        if (timer <= 0) {
            clearInterval(interval);
            handleAnswerSubmission(true);
        }
        return () => clearInterval(interval);
    }, [view, timer, isAnswered, timerSetting]);

    const startFilteredQuiz = useCallback(() => {
        let questionsToStart = allQuestions;
        if (selectedCategory !== 'All') {
            questionsToStart = questionsToStart.filter(q => q.Category === selectedCategory);
        }
        if (selectedDifficulty !== 'All') {
            questionsToStart = questionsToStart.filter(q => q.Difficulty === selectedDifficulty);
        }
        if (questionsToStart.length === 0) {
            alert("선택하신 조건에 해당하는 문제가 없습니다.");
            return;
        }
        commonStartQuiz(shuffleArray(questionsToStart));
    }, [allQuestions, selectedCategory, selectedDifficulty, timerSetting]);

    const startReviewQuiz = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const questionsToStart = allQuestions.filter(q => quizProgress[q.ID]?.nextReviewDate <= today);
        if (questionsToStart.length === 0) {
            alert("오늘 복습할 문제가 없습니다!");
            return;
        }
        commonStartQuiz(shuffleArray(questionsToStart));
    }, [allQuestions, quizProgress, timerSetting]);

    const commonStartQuiz = (questions) => {
        setCurrentQuestionSet(questions);
        setCurrentQuestionIndex(0);
        setScore(0);
        setUserAnswers({});
        setIsAnswered(false);
        setFeedback({ text: '', isCorrect: false });
        setTimer(timerSetting);
        setView('quiz');
    };

    const handleAnswerSubmission = useCallback((isTimeout = false) => {
        if (isAnswered || !currentQuestion) return;
        let updatedStreak = learningStreak;
        const today = new Date();
        const lastQuizDateStr = localStorage.getItem('lastQuizDate');
        if (!lastQuizDateStr || !isToday(new Date(lastQuizDateStr), today)) {
            const savedStreak = parseInt(localStorage.getItem('streak') || '0', 10);
            if (lastQuizDateStr && isYesterday(new Date(lastQuizDateStr), today)) {
                updatedStreak = savedStreak + 1;
            } else {
                updatedStreak = 1;
            }
            setLearningStreak(updatedStreak);
        }
        const userAnswer = userAnswers[currentQuestion.ID];
        let isCorrect = false;
        if (!isTimeout) {
            if (currentQuestion.Type === 'MultipleChoice') isCorrect = userAnswer === currentQuestion.Answer;
            else if (currentQuestion.Type === 'ShortAnswer') {
                const cs = String(currentQuestion.CaseSensitive).toLowerCase() === 'true';
                const ua = cs ? (userAnswer || '') : (userAnswer || '').toLowerCase();
                const ca = String(currentQuestion.Answer).split(',').map(a => cs ? a.trim() : a.trim().toLowerCase());
                isCorrect = ca.includes(ua);
            }
        }
        setFeedback({ text: isTimeout ? '시간 초과!' : (isCorrect ? '정답입니다!' : '오답입니다.'), isCorrect });
        if (isCorrect) setScore(prev => prev + 1);

        const progress = quizProgress[currentQuestion.ID] || { srsLevel: 0 };
        const newSrsLevel = isCorrect ? progress.srsLevel + 1 : 1;
        const intervalDays = srsIntervals[Math.min(newSrsLevel - 1, srsIntervals.length - 1)];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
        const updatedProgress = { ...quizProgress, [currentQuestion.ID]: { ...progress, attempts: (progress.attempts || 0) + 1, correct: (progress.correct || 0) + (isCorrect ? 1 : 0), srsLevel: newSrsLevel, lastAttemptDate: new Date().toISOString(), nextReviewDate: nextReviewDate.toISOString().split('T')[0] } };
        setQuizProgress(updatedProgress);
        saveDataToStorage(updatedProgress, updatedStreak);
        setIsAnswered(true);
    }, [isAnswered, userAnswers, currentQuestion, quizProgress, saveDataToStorage, learningStreak]);

    const goToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < currentQuestionSet.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsAnswered(false);
            setFeedback({ text: '', isCorrect: false });
            setTimer(timerSetting);
        } else {
            setView('finished');
        }
    }, [currentQuestionIndex, currentQuestionSet.length, timerSetting]);

    const handleOptionChange = useCallback((qid, ans) => !isAnswered && setUserAnswers(p => ({ ...p, [qid]: ans })), [isAnswered]);
    
    const getTimerColor = (time) => {
        if (timerSetting === 0) return 'var(--primary-color)';
        const percentage = time / timerSetting;
        if (percentage <= 0.2) return 'var(--incorrect-color)';
        if (percentage <= 0.4) return '#f5a623';
        return 'var(--primary-color)';
    };

    const renderSettingsModal = () => (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <h2>설정</h2>
                <div className="setting-group">
                    <label>문제당 제한 시간</label>
                    <div className="options">
                        {[15, 30, 60, 0].map(time => (
                            <button key={time} className={timerSetting === time ? 'active' : ''}
                                onClick={() => {
                                    setTimerSetting(time);
                                    localStorage.setItem('timerSetting', time);
                                }}>
                                {time === 0 ? '끄기' : `${time}초`}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="action-btn btn-primary settings-close-btn" onClick={() => setIsSettingsOpen(false)}>닫기</button>
            </div>
        </div>
    );

    const renderView = () => {
        switch (view) {
            case 'start':
                const reviewCount = allQuestions.filter(q => quizProgress[q.ID]?.nextReviewDate <= new Date().toISOString().split('T')[0]).length;
                return (
                    <div className="view-start">
                        {isSettingsOpen && renderSettingsModal()}
                        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
                        <h1 className="header">학습 퀴즈</h1>
                        <p className="description">풀고 싶은 문제를 선택하고 퀴즈를 시작하세요.</p>
                        
                        {learningStreak > 0 && (
                            <div className="streak-message">
                                🔥 <strong>{learningStreak}일 연속</strong> 학습 중!
                            </div>
                        )}

                        <div className="filters-container">
                            <div className="filter-group">
                                <label htmlFor="category-select">카테고리</label>
                                <select id="category-select" className="category-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                    {uniqueCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label htmlFor="difficulty-select">난이도</label>
                                <select id="difficulty-select" className="category-select" value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                                    {uniqueDifficulties.map(diff => (<option key={diff} value={diff}>{diff}</option>))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="start-options">
                            <button className="action-btn btn-primary" onClick={startFilteredQuiz}>
                               퀴즈 시작하기
                            </button>
                            <button className="action-btn btn-correct" onClick={startReviewQuiz} disabled={reviewCount === 0}>
                               오늘 복습 ({reviewCount})
                            </button>
                            <button className="action-btn btn-secondary" onClick={() => setView('stats')}>
                               통계 보기
                            </button>
                        </div>
                    </div>
                );
            
            case 'quiz':
                if (!currentQuestion) return <div className="message-container">오류: 현재 문제를 찾을 수 없습니다.</div>;
                return (
                    <div>
                        {timerSetting > 0 && (
                            <div className="timer-bar-container">
                                <div className="timer-bar" style={{ width: `${(timer / timerSetting) * 100}%`, backgroundColor: getTimerColor(timer) }}></div>
                            </div>
                        )}
                        <div className="quiz-header">
                            <span>문제 {currentQuestionIndex + 1} / {currentQuestionSet.length}</span>
                            {timerSetting > 0 && <span>{timer}초</span>}
                            <button className="exit-btn" onClick={() => {
                                if (window.confirm("퀴즈를 중단하고 나가시겠습니까?")) {
                                    setView('start');
                                }
                            }}>나가기</button>
                        </div>
                        
                        <div className="question-meta-container">
                            <span className="meta-tag category">{currentQuestion.Category}</span>
                            {currentQuestion.SubCategory && <span className="meta-tag">{currentQuestion.SubCategory}</span>}
                            {currentQuestion.Difficulty && <span className="meta-tag difficulty">{currentQuestion.Difficulty}</span>}
                        </div>
                        
                        <p className="question-text">{currentQuestion.Question}</p>
                        <div className="options-container">
                            {shuffledOptions.map((option) => {
                                const isSelected = userAnswers[currentQuestion.ID] === option;
                                let btnClass = 'option-btn';
                                if (isAnswered) {
                                    if (option === currentQuestion.Answer) btnClass += ' correct';
                                    else if (isSelected) btnClass += ' incorrect';
                                } else if (isSelected) {
                                    btnClass += ' selected';
                                }
                                return (
                                    <button key={option} onClick={() => handleOptionChange(currentQuestion.ID, option)} className={btnClass} disabled={isAnswered}>
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        {isAnswered && (
                            <div className={`feedback-section ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                                <p className={`feedback-text ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>{feedback.text}</p>
                                {currentQuestion.Explanation && (
                                    <p className="explanation-text">
                                        <strong>해설:</strong> {currentQuestion.Explanation}
                                    </p>
                                )}
                            </div>
                        )}
                        <div style={{marginTop: '24px'}}>
                            {!isAnswered 
                                ? <button onClick={() => handleAnswerSubmission(false)} className="action-btn btn-primary" disabled={!userAnswers[currentQuestion.ID]}>정답 확인</button>
                                : <button onClick={goToNextQuestion} className="action-btn btn-primary">다음 문제</button>
                            }
                        </div>
                    </div>
                );

            case 'finished':
                return (
                    <div className="view-finished">
                        <h1 className="header">퀴즈 완료!</h1>
                        <p className="result-score">
                            총 {currentQuestionSet.length}문제 중<br/>
                            <strong>{score}</strong>
                            문제를 맞혔습니다.
                        </p>
                        <div className="result-actions">
                            <button className="action-btn btn-primary" onClick={() => setView('start')}>처음으로 돌아가기</button>
                            <button className="action-btn btn-secondary" onClick={() => setView('stats')}>학습 통계 보기</button>
                        </div>
                    </div>
                );
            
            case 'stats':
                 return <StatisticsDashboard quizProgress={quizProgress} allQuestions={allQuestions} onBack={() => setView('start')} />;

            default:
                return <div className="message-container">알 수 없는 화면입니다.</div>;
        }
    };

    return (
        <div className="app-container">
            <div className="quiz-container">
                {isLoading 
                    ? (
                        <div className="message-container">
                            <div className="loading-spinner"></div>
                            <p style={{marginTop: '16px'}}>데이터를 불러오는 중입니다...</p>
                        </div>
                      )
                    : error 
                    ? <div className="message-container">{error}</div>
                    : renderView()
                }
            </div>
        </div>
    );
}

export default App;