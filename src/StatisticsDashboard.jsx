import React, { useMemo } from 'react';
import './StatisticsDashboard.css';

// [난이도 기능] 통계 계산 로직에 난이도별 분석 추가
const calculateStatistics = (quizProgress, allQuestions) => {
    const progressValues = Object.values(quizProgress);
    if (progressValues.length === 0) return null;

    const totalAttempts = progressValues.reduce((sum, p) => sum + (p.attempts || 0), 0);
    const totalCorrect = progressValues.reduce((sum, p) => sum + (p.correct || 0), 0);
    const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    const categoryStats = {};
    const difficultyStats = {}; // 난이도별 통계 객체

    allQuestions.forEach(q => {
        const progress = quizProgress[q.ID];
        if (!progress) return;

        // 카테고리별 통계 집계
        if (q.Category) {
            if (!categoryStats[q.Category]) {
                categoryStats[q.Category] = { attempts: 0, correct: 0 };
            }
            categoryStats[q.Category].attempts += progress.attempts || 0;
            categoryStats[q.Category].correct += progress.correct || 0;
        }

        // 난이도별 통계 집계
        if (q.Difficulty) {
            if (!difficultyStats[q.Difficulty]) {
                difficultyStats[q.Difficulty] = { attempts: 0, correct: 0 };
            }
            difficultyStats[q.Difficulty].attempts += progress.attempts || 0;
            difficultyStats[q.Difficulty].correct += progress.correct || 0;
        }
    });
    
    Object.keys(categoryStats).forEach(cat => {
        const catData = categoryStats[cat];
        catData.accuracy = catData.attempts > 0 ? (catData.correct / catData.attempts) * 100 : 0;
    });

    Object.keys(difficultyStats).forEach(diff => {
        const diffData = difficultyStats[diff];
        diffData.accuracy = diffData.attempts > 0 ? (diffData.correct / diffData.attempts) * 100 : 0;
    });

    const incorrectQuestions = Object.entries(quizProgress)
        .map(([id, progress]) => ({ ...allQuestions.find(q => String(q.ID) === id), incorrectCount: (progress.attempts || 0) - (progress.correct || 0) }))
        .filter(q => q.ID && q.incorrectCount > 0)
        .sort((a, b) => b.incorrectCount - a.incorrectCount)
        .slice(0, 5);

    return { overallAccuracy, categoryStats, difficultyStats, incorrectQuestions };
};

function StatisticsDashboard({ quizProgress, allQuestions, onBack }) {
    const stats = useMemo(() => calculateStatistics(quizProgress, allQuestions), [quizProgress, allQuestions]);
    
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
                    <ul className="stats-list">
                        {Object.entries(stats.categoryStats).map(([category, data]) => (
                             <li key={category}>
                                <span className="list-item-name">{category}</span>
                                <span className="list-item-value">{data.accuracy.toFixed(1)}%</span>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* [난이도 기능] 난이도별 통계 카드 추가 */}
                <div className="stat-card difficulty-stats">
                    <h3>난이도별 정답률</h3>
                    <ul className="stats-list">
                        {Object.entries(stats.difficultyStats).map(([difficulty, data]) => (
                             <li key={difficulty}>
                                <span className="list-item-name">{difficulty}</span>
                                <span className="list-item-value">{data.accuracy.toFixed(1)}%</span>
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