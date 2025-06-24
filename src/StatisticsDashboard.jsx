import React, { useMemo } from 'react';
import './StatisticsDashboard.css'; // 대시보드 전용 CSS 파일

// 통계 데이터를 계산하는 로직
const calculateStatistics = (quizProgress, allQuestions) => {
    const progressValues = Object.values(quizProgress);
    if (progressValues.length === 0) {
        return null;
    }

    // 전체 정답률
    const totalAttempts = progressValues.reduce((sum, p) => sum + (p.attempts || 0), 0);
    const totalCorrect = progressValues.reduce((sum, p) => sum + (p.correct || 0), 0);
    const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    // 카테고리별 통계
    const categoryStats = {};
    allQuestions.forEach(q => {
        const progress = quizProgress[q.ID];
        if (!progress) return;

        if (!categoryStats[q.Category]) {
            categoryStats[q.Category] = { attempts: 0, correct: 0, questionCount: 0 };
        }
        categoryStats[q.Category].attempts += progress.attempts || 0;
        categoryStats[q.Category].correct += progress.correct || 0;
    });
    
    // 카테고리별 문제 수 카운트
    allQuestions.forEach(q => {
        if(categoryStats[q.Category]) {
           categoryStats[q.Category].questionCount = (categoryStats[q.Category].questionCount || 0) + 1;
        }
    });

    Object.keys(categoryStats).forEach(cat => {
        const catData = categoryStats[cat];
        catData.accuracy = catData.attempts > 0 ? (catData.correct / catData.attempts) * 100 : 0;
    });

    // 가장 많이 틀린 문제
    const incorrectQuestions = Object.entries(quizProgress)
        .map(([id, progress]) => {
            const incorrectCount = (progress.attempts || 0) - (progress.correct || 0);
            const questionData = allQuestions.find(q => String(q.ID) === id);
            return {
                ...questionData,
                incorrectCount
            };
        })
        .filter(q => q.incorrectCount > 0)
        .sort((a, b) => b.incorrectCount - a.incorrectCount)
        .slice(0, 5);

    return { overallAccuracy, categoryStats, incorrectQuestions };
};

function StatisticsDashboard({ quizProgress, allQuestions, onBack }) {
    const stats = useMemo(() => calculateStatistics(quizProgress, allQuestions), [quizProgress, allQuestions]);
    
    // [1단계-UX] 데이터가 없을 때 보여줄 화면 개선
    if (!stats) {
        return (
            <div className="stats-container">
                <div className="stats-header">
                    <h1>학습 통계</h1>
                    <button onClick={onBack} className="back-btn">돌아가기</button>
                </div>
                <div className="no-data-container">
                    <span className="no-data-icon">📊</span>
                    <h2>데이터가 부족해요!</h2>
                    <p>퀴즈를 하나 이상 완료하면 이곳에서 멋진 학습 리포트를 볼 수 있습니다.</p>
                    <button onClick={onBack} className="start-btn" style={{textAlign: 'center', maxWidth: '250px'}}>
                        퀴즈 풀러가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="stats-container">
            <div className="stats-header">
                <h1>학습 통계</h1>
                <button onClick={onBack} className="back-btn">돌아가기</button>
            </div>

            <div className="stats-grid">
                <div className="stat-card overall-accuracy">
                    <h3>전체 평균 정답률</h3>
                    <p className="stat-value">{stats.overallAccuracy.toFixed(1)}%</p>
                    <div className="progress-bar-background">
                        <div className="progress-bar-foreground" style={{width: `${stats.overallAccuracy}%`}}></div>
                    </div>
                </div>

                <div className="stat-card category-stats">
                    <h3>카테고리별 정답률</h3>
                    <ul>
                        {Object.entries(stats.categoryStats).map(([category, data]) => (
                             <li key={category}>
                                <div className="category-name">{category} ({data.questionCount}문제)</div>
                                <div className="category-accuracy">{data.accuracy.toFixed(1)}%</div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="stat-card incorrect-questions">
                    <h3>자주 틀리는 문제 Top 5</h3>
                     <ul>
                        {stats.incorrectQuestions.map((q) => (
                             <li key={q.ID}>
                                <p className="question-title">{q.Question}</p>
                                <span className="incorrect-count">{q.incorrectCount}회 오답</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default StatisticsDashboard;